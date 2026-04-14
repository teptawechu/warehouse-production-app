import { Router } from "express";
import { z } from "zod";
import { pool, withTransaction } from "../db.js";
import { requireRole } from "../middleware/auth.js";
import { asyncHandler, ApiError, parseDateRange } from "../utils/http.js";
import { applyBillStockEffect } from "../services/stockService.js";
import { insertAudit } from "../services/auditService.js";

const router = Router();

const billTypeEnum = z.enum([
  "ISSUE_TO_TEAM",
  "RETURN_FROM_TEAM",
  "RETURN_FROM_WLMA"
]);

const createBillSchema = z.object({
  bill_type: billTypeEnum,
  warehouse_id: z.number().int().positive(),
  team_id: z.number().int().positive().nullable().optional(),
  sender_name: z.string().min(1).max(150),
  receiver_name: z.string().min(1).max(150),
  remarks: z.string().max(1000).optional().nullable(),
  auto_confirm: z.boolean().default(false),
  items: z
    .array(
      z.object({
        product_id: z.number().int().positive(),
        qty: z.number().positive()
      })
    )
    .min(1)
});

const cancelSchema = z.object({
  reason: z.string().min(1).max(1000)
});

const seedRandomBillsSchema = z.object({
  warehouse_id: z.number().int().positive().default(1),
  count: z.number().int().min(1).max(2000).default(120),
  items_per_bill: z.number().int().min(1).max(50).default(15),
  preload_rounds: z.number().int().min(0).max(5000).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  tag: z.string().min(1).max(120).default("[AUTO_TEST_RANDOM]"),
  types: z.array(billTypeEnum).min(1).optional()
});

const cleanupSeedBillsSchema = z.object({
  tag: z.string().min(1).max(120).default("[AUTO_TEST_RANDOM]"),
  dry_run: z.boolean().default(false),
  limit: z.number().int().min(1).max(500).default(100)
});

const PREVIOUS_STATUS_MARKER = /^\[PREV_STATUS=(DRAFT|CONFIRMED)\]\s*/i;
const TEST_BILL_TYPES = ["ISSUE_TO_TEAM", "RETURN_FROM_TEAM", "RETURN_FROM_WLMA"];

function encodeCancelledReason(previousStatus, reason) {
  return `[PREV_STATUS=${previousStatus}] ${String(reason || "").trim()}`.trim();
}

function decodePreviousStatusFromReason(cancelledReason, fallbackStatus = "DRAFT") {
  const reason = String(cancelledReason || "");
  const matched = reason.match(PREVIOUS_STATUS_MARKER);
  if (matched?.[1]) {
    return matched[1].toUpperCase();
  }
  return fallbackStatus === "CONFIRMED" ? "CONFIRMED" : "DRAFT";
}

async function buildBillNo(connection) {
  const [dateRows] = await connection.execute(
    `SELECT DATE_FORMAT(NOW(), '%d%m%y') AS ddmmyy`
  );
  const ddmmyy = String(dateRows?.[0]?.ddmmyy || "");
  if (!/^\d{6}$/.test(ddmmyy)) {
    throw new ApiError(500, "Cannot generate bill number");
  }

  const prefix = `KLL${ddmmyy}`;
  const [lastRows] = await connection.execute(
    `SELECT bill_no
     FROM bills
     WHERE bill_no LIKE ?
     ORDER BY bill_no DESC
     LIMIT 1
     FOR UPDATE`,
    [`${prefix}%`]
  );

  let nextSeq = 0;
  if (lastRows.length) {
    const lastBillNo = String(lastRows[0].bill_no || "");
    const matched = lastBillNo.match(/^KLL\d{6}(\d{3})$/);
    const currentSeq = Number(matched?.[1] ?? -1);
    nextSeq = currentSeq + 1;
  }

  if (!Number.isFinite(nextSeq) || nextSeq < 0 || nextSeq > 999) {
    throw new ApiError(400, "Bill number sequence exceeded for today");
  }

  return `${prefix}${String(nextSeq).padStart(3, "0")}`;
}

function validateTeamRequirement(payload) {
  if (payload.bill_type === "RETURN_FROM_WLMA") {
    return;
  }
  if (!payload.team_id) {
    throw new ApiError(400, "team_id is required for ISSUE_TO_TEAM and RETURN_FROM_TEAM");
  }
}

function applyBillTypeDefaults(payload) {
  if (payload.bill_type !== "RETURN_FROM_WLMA") {
    return payload;
  }
  return {
    ...payload,
    team_id: null,
    sender_name: "WLMA"
  };
}

function isTruthy(value) {
  const raw = String(value || "").trim().toLowerCase();
  return ["1", "true", "yes", "y", "on"].includes(raw);
}

function assertTestSeedAccess(req) {
  if (!isTruthy(process.env.ENABLE_TEST_SEED_API)) {
    throw new ApiError(403, "Test seed API is disabled");
  }
  const requiredKey = String(process.env.TEST_SEED_API_KEY || "").trim();
  if (!requiredKey) {
    return;
  }
  const incomingKey = String(req.headers["x-seed-key"] || "").trim();
  if (!incomingKey || incomingKey !== requiredKey) {
    throw new ApiError(403, "Invalid seed api key");
  }
}

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function pickDistinct(list, count) {
  if (count >= list.length) {
    return [...list];
  }
  const copy = [...list];
  const out = [];
  while (out.length < count && copy.length) {
    const idx = Math.floor(Math.random() * copy.length);
    out.push(copy[idx]);
    copy.splice(idx, 1);
  }
  return out;
}

function randomQtyByType(type) {
  if (type === "RETURN_FROM_WLMA") {
    return Math.floor(Math.random() * 41) + 10; // 10..50
  }
  return Math.floor(Math.random() * 7) + 1; // 1..7
}

function randomDatetimeBetween(fromDate, toDate) {
  const fromMs = fromDate.getTime();
  const toMs = toDate.getTime();
  const min = Math.min(fromMs, toMs);
  const max = Math.max(fromMs, toMs);
  const value = min + Math.floor(Math.random() * (max - min + 1));
  return new Date(value);
}

function formatMysqlDatetime(date) {
  const pad = (v) => String(v).padStart(2, "0");
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
}

function parseIsoDateOrThrow(value, fallbackIso) {
  const raw = String(value || fallbackIso);
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    throw new ApiError(400, "Invalid from/to date (use YYYY-MM-DD)");
  }
  return parsed;
}

function chooseRandomBillType(types) {
  if (types.length === 1) {
    return types[0];
  }
  const hasDefaultSet = TEST_BILL_TYPES.every((type) => types.includes(type));
  if (!hasDefaultSet) {
    return pickRandom(types);
  }

  const roll = Math.random();
  if (roll < 0.45) {
    return "ISSUE_TO_TEAM";
  }
  if (roll < 0.8) {
    return "RETURN_FROM_TEAM";
  }
  return "RETURN_FROM_WLMA";
}

async function createConfirmedBillWithDatetime(connection, options) {
  const {
    actorUserId,
    warehouseId,
    teamId,
    billType,
    senderName,
    receiverName,
    remarks,
    billDatetime,
    items
  } = options;

  let billResult = null;
  let billNo = "";

  for (let attempt = 0; attempt < 5; attempt += 1) {
    billNo = await buildBillNo(connection);
    try {
      [billResult] = await connection.execute(
        `INSERT INTO bills
         (bill_no, bill_datetime, warehouse_id, team_id, bill_type, sender_name, receiver_name, status, remarks, created_by, confirmed_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'CONFIRMED', ?, ?, ?)`,
        [
          billNo,
          billDatetime,
          warehouseId,
          teamId,
          billType,
          senderName,
          receiverName,
          remarks || null,
          actorUserId,
          actorUserId
        ]
      );
      break;
    } catch (error) {
      if (error?.code !== "ER_DUP_ENTRY" || attempt === 4) {
        throw error;
      }
    }
  }

  if (!billResult?.insertId) {
    throw new ApiError(500, "Cannot generate bill number");
  }

  const billId = Number(billResult.insertId);
  const mergedItemsMap = new Map();
  items.forEach((item) => {
    mergedItemsMap.set(item.product_id, (mergedItemsMap.get(item.product_id) || 0) + Number(item.qty));
  });
  const mergedItems = [...mergedItemsMap.entries()].map(([product_id, qty]) => ({ product_id, qty }));

  for (const item of mergedItems) {
    await connection.execute(
      `INSERT INTO bill_items (bill_id, product_id, qty) VALUES (?, ?, ?)`,
      [billId, item.product_id, item.qty]
    );
  }

  const [itemRows] = await connection.execute(
    `SELECT bill_item_id, product_id, qty
     FROM bill_items
     WHERE bill_id = ?`,
    [billId]
  );

  await applyBillStockEffect(connection, {
    bill: {
      bill_id: billId,
      warehouse_id: warehouseId,
      team_id: teamId,
      bill_type: billType
    },
    items: itemRows,
    actorUserId,
    reverse: false
  });

  await connection.execute(
    `UPDATE stock_movements
     SET movement_datetime = ?
     WHERE bill_id = ?`,
    [billDatetime, billId]
  );

  return {
    bill_id: billId,
    bill_no: billNo
  };
}

async function getBillDetailById(connection, billId) {
  const [billRows] = await connection.execute(
    `SELECT b.bill_id, b.bill_no, b.bill_datetime, b.warehouse_id, b.team_id, b.bill_type, b.sender_name, b.receiver_name,
            b.status, b.remarks, b.created_by, b.confirmed_by, b.cancelled_by, b.cancelled_reason, b.created_at, b.updated_at,
            t.team_code, t.team_name, w.warehouse_code, w.warehouse_name,
            u.username AS created_by_username, u.display_name AS created_by_name
     FROM bills b
     LEFT JOIN teams t ON t.team_id = b.team_id
     LEFT JOIN warehouses w ON w.warehouse_id = b.warehouse_id
     LEFT JOIN users u ON u.user_id = b.created_by
     WHERE b.bill_id = ?
     LIMIT 1`,
    [billId]
  );
  if (!billRows.length) {
    throw new ApiError(404, "Bill not found");
  }

  const [itemRows] = await connection.execute(
    `SELECT bi.bill_item_id, bi.product_id, bi.qty, p.product_code_wlma, p.product_name, p.unit
     FROM bill_items bi
     JOIN products p ON p.product_id = bi.product_id
     WHERE bi.bill_id = ?
     ORDER BY p.product_code_wlma ASC`,
    [billId]
  );

  return {
    ...billRows[0],
    items: itemRows
  };
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const where = ["1=1"];
    const params = [];
    const pageRaw = Number(req.query.page || 1);
    const pageSizeRaw = Number(req.query.page_size || 25);
    const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
    const pageSize = [25, 50, 100].includes(pageSizeRaw) ? pageSizeRaw : 25;
    const offset = Math.max(0, (page - 1) * pageSize);
    const sortBy = String(req.query.sort_by || "bill_no").toLowerCase();
    const sortDirRaw = String(req.query.sort_dir || "desc").toLowerCase();
    const sortDir = sortDirRaw === "asc" ? "ASC" : "DESC";

    if (req.query.status) {
      where.push("b.status = ?");
      params.push(String(req.query.status).toUpperCase());
    }
    if (req.query.type) {
      where.push("b.bill_type = ?");
      params.push(String(req.query.type).toUpperCase());
    }
    if (req.query.team_id) {
      where.push("b.team_id = ?");
      params.push(Number(req.query.team_id));
    }
    if (req.query.warehouse_id) {
      const warehouseId = Number(req.query.warehouse_id);
      if (Number.isFinite(warehouseId) && warehouseId > 0) {
        where.push("b.warehouse_id = ?");
        params.push(warehouseId);
      }
    }

    const date = parseDateRange(req.query.from, req.query.to);
    const clause = date.clause ? date.clause.replaceAll("b.bill_datetime", "b.bill_datetime") : "";
    const whereSql = `${where.join(" AND ")}${clause}`;
    const orderBy = sortBy === "bill_no"
      ? `ORDER BY b.bill_no ${sortDir}, b.bill_id ${sortDir}`
      : `ORDER BY b.bill_datetime ${sortDir}, b.bill_id ${sortDir}`;
    const limitSql = `LIMIT ${pageSize} OFFSET ${offset}`;

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS total
       FROM bills b
       WHERE ${whereSql}`,
      [...params, ...date.params]
    );
    const total = Number(countRows?.[0]?.total || 0);

    const [rows] = await pool.execute(
      `SELECT b.bill_id, b.bill_no, b.bill_datetime, b.bill_type, b.status, b.sender_name, b.receiver_name,
              b.team_id, t.team_code, t.team_name, b.warehouse_id, w.warehouse_code, w.warehouse_name,
              b.created_by, u.username AS created_by_username, u.display_name AS created_by_name,
              COUNT(bi.bill_item_id) AS item_count,
              COALESCE(SUM(bi.qty), 0) AS total_qty
       FROM bills b
       LEFT JOIN bill_items bi ON bi.bill_id = b.bill_id
       LEFT JOIN teams t ON t.team_id = b.team_id
       LEFT JOIN warehouses w ON w.warehouse_id = b.warehouse_id
       LEFT JOIN users u ON u.user_id = b.created_by
       WHERE ${whereSql}
       GROUP BY b.bill_id
       ${orderBy}
       ${limitSql}`,
      [...params, ...date.params]
    );

    res.json({
      rows,
      total,
      page,
      page_size: pageSize,
      total_pages: Math.max(1, Math.ceil(total / pageSize))
    });
  })
);

router.post(
  "/tools/seed-random",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    assertTestSeedAccess(req);

    const parsed = seedRandomBillsSchema.safeParse(req.body || {});
    if (!parsed.success) {
      throw new ApiError(400, "Invalid payload");
    }
    const payload = parsed.data;

    const fromDate = parseIsoDateOrThrow(payload.from, "2025-10-01");
    const toDate = parseIsoDateOrThrow(payload.to, new Date().toISOString().slice(0, 10));
    const selectedTypes = payload.types?.length ? payload.types : [...TEST_BILL_TYPES];

    const [warehouseRows] = await pool.execute(
      `SELECT warehouse_id FROM warehouses WHERE warehouse_id = ? AND is_active = 1 LIMIT 1`,
      [payload.warehouse_id]
    );
    if (!warehouseRows.length) {
      throw new ApiError(400, "Warehouse not found or inactive");
    }

    const [teamRows] = await pool.execute(
      `SELECT team_id, team_code FROM teams WHERE is_active = 1 ORDER BY team_id ASC`
    );
    const [productRows] = await pool.execute(
      `SELECT product_id FROM products WHERE is_active = 1 ORDER BY product_id ASC`
    );

    const teams = teamRows.map((row) => ({
      team_id: Number(row.team_id),
      team_code: String(row.team_code || "")
    }));
    const products = productRows.map((row) => ({
      product_id: Number(row.product_id)
    }));

    if (!products.length) {
      throw new ApiError(400, "No active products found");
    }
    if (
      (selectedTypes.includes("ISSUE_TO_TEAM") || selectedTypes.includes("RETURN_FROM_TEAM"))
      && !teams.length
    ) {
      throw new ApiError(400, "No active teams found");
    }

    const safeItemsPerBill = Math.min(Math.max(1, payload.items_per_bill), products.length);
    const preloadRounds = selectedTypes.includes("ISSUE_TO_TEAM")
      ? payload.preload_rounds ?? Math.max(20, Math.floor(payload.count * 0.25))
      : 0;

    let created = 0;
    let skipped = 0;
    let failed = 0;
    const createdBillIds = [];
    const errors = [];

    const createOneBill = async ({
      billType,
      teamId,
      senderName,
      receiverName,
      remarks,
      items,
      billDatetime
    }) => withTransaction((connection) => createConfirmedBillWithDatetime(connection, {
      actorUserId: req.user.user_id,
      warehouseId: payload.warehouse_id,
      teamId,
      billType,
      senderName,
      receiverName,
      remarks,
      billDatetime,
      items
    }));

    for (let i = 0; i < preloadRounds; i += 1) {
      const selected = pickDistinct(products, safeItemsPerBill);
      const items = selected.map((p) => ({
        product_id: p.product_id,
        qty: randomQtyByType("RETURN_FROM_WLMA")
      }));
      const billDatetime = formatMysqlDatetime(randomDatetimeBetween(fromDate, toDate));

      try {
        const row = await createOneBill({
          billType: "RETURN_FROM_WLMA",
          teamId: null,
          senderName: "WLMA",
          receiverName: "TEST_WAREHOUSE",
          remarks: `${payload.tag} preload`,
          items,
          billDatetime
        });
        created += 1;
        createdBillIds.push(row.bill_id);
      } catch (error) {
        failed += 1;
        if (errors.length < 10) {
          errors.push(String(error.message || "unknown error"));
        }
      }
    }

    for (let i = 0; i < payload.count; i += 1) {
      const billType = chooseRandomBillType(selectedTypes);
      const team = billType === "RETURN_FROM_WLMA" ? null : pickRandom(teams);
      const selected = pickDistinct(products, safeItemsPerBill);
      const items = selected.map((p) => ({
        product_id: p.product_id,
        qty: randomQtyByType(billType)
      }));
      const billDatetime = formatMysqlDatetime(randomDatetimeBetween(fromDate, toDate));

      const senderName = billType === "ISSUE_TO_TEAM"
        ? "TEST_WAREHOUSE"
        : billType === "RETURN_FROM_TEAM"
          ? team.team_code
          : "WLMA";
      const receiverName = billType === "ISSUE_TO_TEAM"
        ? team.team_code
        : "TEST_WAREHOUSE";

      try {
        const row = await createOneBill({
          billType,
          teamId: billType === "RETURN_FROM_WLMA" ? null : team.team_id,
          senderName,
          receiverName,
          remarks: `${payload.tag} mixed`,
          items,
          billDatetime
        });
        created += 1;
        createdBillIds.push(row.bill_id);
      } catch (error) {
        const message = String(error?.message || "").toLowerCase();
        if (message.includes("insufficient stock")) {
          skipped += 1;
          continue;
        }
        failed += 1;
        if (errors.length < 10) {
          errors.push(String(error.message || "unknown error"));
        }
      }
    }

    await withTransaction(async (connection) => {
      await insertAudit(connection, {
        userId: req.user.user_id,
        action: "SEED_RANDOM_TEST_BILLS",
        entity: "bills",
        entityId: `BULK_${Date.now()}`,
        detail: {
          warehouse_id: payload.warehouse_id,
          count_requested: payload.count,
          items_per_bill: safeItemsPerBill,
          preload_rounds: preloadRounds,
          from: fromDate.toISOString().slice(0, 10),
          to: toDate.toISOString().slice(0, 10),
          tag: payload.tag,
          types: selectedTypes,
          result: {
            created,
            skipped,
            failed
          }
        }
      });
    });

    res.json({
      ok: true,
      summary: {
        created,
        skipped,
        failed,
        preload_rounds: preloadRounds,
        items_per_bill: safeItemsPerBill
      },
      created_bill_ids: createdBillIds,
      errors
    });
  })
);

router.post(
  "/tools/cleanup-random",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    assertTestSeedAccess(req);

    const parsed = cleanupSeedBillsSchema.safeParse(req.body || {});
    if (!parsed.success) {
      throw new ApiError(400, "Invalid payload");
    }
    const payload = parsed.data;
    const likePattern = `${payload.tag}%`;
    const safeLimit = Math.min(Math.max(Number(payload.limit || 100), 1), 500);

    const [billCountRows] = await pool.execute(
      `SELECT COUNT(*) AS total
       FROM bills
       WHERE remarks LIKE ?`,
      [likePattern]
    );
    const totalBills = Number(billCountRows?.[0]?.total || 0);
    if (!totalBills) {
      res.json({
        ok: true,
        dry_run: payload.dry_run,
        tag: payload.tag,
        total_bills: 0,
        preview: []
      });
      return;
    }

    const [previewRows] = await pool.execute(
      `SELECT bill_id, bill_no, status, bill_datetime
       FROM bills
       WHERE remarks LIKE ?
       ORDER BY bill_id DESC
       LIMIT ${safeLimit}`,
      [likePattern]
    );

    if (payload.dry_run) {
      res.json({
        ok: true,
        dry_run: true,
        tag: payload.tag,
        total_bills: totalBills,
        preview: previewRows
      });
      return;
    }

    const result = await withTransaction(async (connection) => {
      const [targetRows] = await connection.execute(
        `SELECT bill_id
         FROM bills
         WHERE remarks LIKE ?
         ORDER BY bill_id DESC
         LIMIT ${safeLimit}`,
        [likePattern]
      );
      const targetBillIds = targetRows.map((row) => Number(row.bill_id)).filter((id) => Number.isFinite(id));
      if (!targetBillIds.length) {
        return {
          deleted_movements: 0,
          deleted_audits: 0,
          deleted_bills: 0
        };
      }

      const idPlaceholders = targetBillIds.map(() => "?").join(",");

      await connection.execute(
        `UPDATE product_stocks ps
         JOIN (
           SELECT sm.warehouse_id, sm.product_id,
                  SUM(CASE WHEN sm.movement_type = 'IN' THEN sm.qty ELSE -sm.qty END) AS net_delta
           FROM stock_movements sm
           WHERE sm.bill_id IN (${idPlaceholders})
           GROUP BY sm.warehouse_id, sm.product_id
         ) d
           ON d.warehouse_id = ps.warehouse_id
          AND d.product_id = ps.product_id
         SET ps.qty_on_hand = ps.qty_on_hand - d.net_delta`,
        targetBillIds
      );

      const [deletedMovementsResult] = await connection.execute(
        `DELETE sm
         FROM stock_movements sm
         WHERE sm.bill_id IN (${idPlaceholders})`,
        targetBillIds
      );

      const [deletedAuditsResult] = await connection.execute(
        `DELETE a
         FROM audit_logs a
         WHERE a.entity = 'bills'
           AND a.entity_id IN (${idPlaceholders})`,
        targetBillIds.map((id) => String(id))
      );

      const [deletedBillsResult] = await connection.execute(
        `DELETE FROM bills WHERE bill_id IN (${idPlaceholders})`,
        targetBillIds
      );

      await insertAudit(connection, {
        userId: req.user.user_id,
        action: "CLEANUP_RANDOM_TEST_BILLS",
        entity: "bills",
        entityId: `BULK_${Date.now()}`,
        detail: {
          tag: payload.tag,
          limit: safeLimit,
          deleted_movements: Number(deletedMovementsResult.affectedRows || 0),
          deleted_audits: Number(deletedAuditsResult.affectedRows || 0),
          deleted_bills: Number(deletedBillsResult.affectedRows || 0)
        }
      });

      return {
        deleted_movements: Number(deletedMovementsResult.affectedRows || 0),
        deleted_audits: Number(deletedAuditsResult.affectedRows || 0),
        deleted_bills: Number(deletedBillsResult.affectedRows || 0)
      };
    });

    res.json({
      ok: true,
      dry_run: false,
      tag: payload.tag,
      limit: safeLimit,
      total_bills: totalBills,
      ...result
    });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const billId = Number(req.params.id);
    if (!Number.isFinite(billId) || billId <= 0) {
      throw new ApiError(400, "Invalid bill id");
    }
    const row = await withTransaction(async (connection) => getBillDetailById(connection, billId));
    res.json({ row });
  })
);

router.post(
  "/",
  requireRole("ADMIN", "STOREKEEPER"),
  asyncHandler(async (req, res) => {
    const parsed = createBillSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(400, "Invalid payload");
    }
    const payload = applyBillTypeDefaults(parsed.data);
    validateTeamRequirement(payload);

    const row = await withTransaction(async (connection) => {
      const [warehouseRows] = await connection.execute(
        `SELECT warehouse_id FROM warehouses WHERE warehouse_id = ? AND is_active = 1`,
        [payload.warehouse_id]
      );
      if (!warehouseRows.length) {
        throw new ApiError(400, "Warehouse not found or inactive");
      }

      if (payload.team_id) {
        const [teamRows] = await connection.execute(
          `SELECT team_id FROM teams WHERE team_id = ? AND is_active = 1`,
          [payload.team_id]
        );
        if (!teamRows.length) {
          throw new ApiError(400, "Team not found or inactive");
        }
      }

      const uniqueProducts = [...new Set(payload.items.map((item) => item.product_id))];
      const [productRows] = await connection.execute(
        `SELECT product_id FROM products WHERE product_id IN (${uniqueProducts.map(() => "?").join(",")})`,
        uniqueProducts
      );
      if (productRows.length !== uniqueProducts.length) {
        throw new ApiError(400, "Some products were not found");
      }

      let billNo = "";
      const status = payload.auto_confirm ? "CONFIRMED" : "DRAFT";
      let billResult = null;
      for (let attempt = 0; attempt < 5; attempt += 1) {
        billNo = await buildBillNo(connection);
        try {
          [billResult] = await connection.execute(
            `INSERT INTO bills
             (bill_no, bill_datetime, warehouse_id, team_id, bill_type, sender_name, receiver_name, status, remarks, created_by, confirmed_by)
             VALUES (?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              billNo,
              payload.warehouse_id,
              payload.team_id || null,
              payload.bill_type,
              payload.sender_name,
              payload.receiver_name,
              status,
              payload.remarks || null,
              req.user.user_id,
              payload.auto_confirm ? req.user.user_id : null
            ]
          );
          break;
        } catch (error) {
          if (error?.code !== "ER_DUP_ENTRY" || attempt === 4) {
            throw error;
          }
        }
      }
      if (!billResult?.insertId) {
        throw new ApiError(500, "Cannot generate bill number");
      }

      const billId = billResult.insertId;
      const mergedItemsMap = new Map();
      payload.items.forEach((item) => {
        mergedItemsMap.set(item.product_id, (mergedItemsMap.get(item.product_id) || 0) + Number(item.qty));
      });
      const mergedItems = [...mergedItemsMap.entries()].map(([product_id, qty]) => ({ product_id, qty }));

      for (const item of mergedItems) {
        await connection.execute(
          `INSERT INTO bill_items (bill_id, product_id, qty) VALUES (?, ?, ?)`,
          [billId, item.product_id, item.qty]
        );
      }

      const [itemRows] = await connection.execute(
        `SELECT bill_item_id, product_id, qty
         FROM bill_items
         WHERE bill_id = ?`,
        [billId]
      );

      if (status === "CONFIRMED") {
        await applyBillStockEffect(connection, {
          bill: {
            bill_id: billId,
            warehouse_id: payload.warehouse_id,
            team_id: payload.team_id || null,
            bill_type: payload.bill_type
          },
          items: itemRows,
          actorUserId: req.user.user_id,
          reverse: false
        });
      }

      await insertAudit(connection, {
        userId: req.user.user_id,
        action: "CREATE_BILL",
        entity: "bills",
        entityId: billId,
        detail: {
          bill_no: billNo,
          bill_type: payload.bill_type,
          status
        }
      });

      return getBillDetailById(connection, billId);
    });

    res.status(201).json({ row });
  })
);

router.post(
  "/:id/confirm",
  requireRole("ADMIN", "STOREKEEPER"),
  asyncHandler(async (req, res) => {
    const billId = Number(req.params.id);
    if (!Number.isFinite(billId) || billId <= 0) {
      throw new ApiError(400, "Invalid bill id");
    }

    const row = await withTransaction(async (connection) => {
      const [billRows] = await connection.execute(
        `SELECT bill_id, warehouse_id, team_id, bill_type, status FROM bills WHERE bill_id = ? FOR UPDATE`,
        [billId]
      );
      const bill = billRows[0];
      if (!bill) {
        throw new ApiError(404, "Bill not found");
      }
      if (bill.status !== "DRAFT") {
        throw new ApiError(400, "Only draft bill can be confirmed");
      }

      const [itemRows] = await connection.execute(
        `SELECT bill_item_id, product_id, qty FROM bill_items WHERE bill_id = ?`,
        [billId]
      );
      if (!itemRows.length) {
        throw new ApiError(400, "Cannot confirm bill without items");
      }

      await applyBillStockEffect(connection, {
        bill,
        items: itemRows,
        actorUserId: req.user.user_id,
        reverse: false
      });

      await connection.execute(
        `UPDATE bills
         SET status = 'CONFIRMED', confirmed_by = ?, updated_at = NOW()
         WHERE bill_id = ?`,
        [req.user.user_id, billId]
      );

      await insertAudit(connection, {
        userId: req.user.user_id,
        action: "CONFIRM_BILL",
        entity: "bills",
        entityId: billId,
        detail: {}
      });

      return getBillDetailById(connection, billId);
    });

    res.json({ row });
  })
);

router.post(
  "/:id/cancel",
  requireRole("ADMIN", "STOREKEEPER"),
  asyncHandler(async (req, res) => {
    const billId = Number(req.params.id);
    if (!Number.isFinite(billId) || billId <= 0) {
      throw new ApiError(400, "Invalid bill id");
    }
    const parsed = cancelSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(400, "Invalid payload");
    }
    const { reason } = parsed.data;

    const row = await withTransaction(async (connection) => {
      const [billRows] = await connection.execute(
        `SELECT bill_id, warehouse_id, team_id, bill_type, status
         FROM bills
         WHERE bill_id = ?
         FOR UPDATE`,
        [billId]
      );
      const bill = billRows[0];
      if (!bill) {
        throw new ApiError(404, "Bill not found");
      }
      if (bill.status === "CANCELLED") {
        throw new ApiError(400, "Bill already cancelled");
      }

      const [itemRows] = await connection.execute(
        `SELECT bill_item_id, product_id, qty FROM bill_items WHERE bill_id = ?`,
        [billId]
      );

      if (bill.status === "CONFIRMED") {
        await applyBillStockEffect(connection, {
          bill,
          items: itemRows,
          actorUserId: req.user.user_id,
          reverse: true
        });
      }

      const cancelledReason = encodeCancelledReason(bill.status, reason);

      await connection.execute(
        `UPDATE bills
         SET status = 'CANCELLED',
             cancelled_by = ?,
             cancelled_reason = ?,
             updated_at = NOW()
         WHERE bill_id = ?`,
        [req.user.user_id, cancelledReason, billId]
      );

      await insertAudit(connection, {
        userId: req.user.user_id,
        action: "CANCEL_BILL",
        entity: "bills",
        entityId: billId,
        detail: {
          reason,
          previous_status: bill.status
        }
      });

      return getBillDetailById(connection, billId);
    });

    res.json({ row });
  })
);

router.post(
  "/:id/restore",
  requireRole("ADMIN", "STOREKEEPER"),
  asyncHandler(async (req, res) => {
    const billId = Number(req.params.id);
    if (!Number.isFinite(billId) || billId <= 0) {
      throw new ApiError(400, "Invalid bill id");
    }

    const row = await withTransaction(async (connection) => {
      const [billRows] = await connection.execute(
        `SELECT bill_id, warehouse_id, team_id, bill_type, status, confirmed_by, cancelled_reason
         FROM bills
         WHERE bill_id = ?
         FOR UPDATE`,
        [billId]
      );
      const bill = billRows[0];
      if (!bill) {
        throw new ApiError(404, "Bill not found");
      }
      if (bill.status !== "CANCELLED") {
        throw new ApiError(400, "Only cancelled bill can be restored");
      }

      const fallbackStatus = bill.confirmed_by ? "CONFIRMED" : "DRAFT";
      const restoreStatus = decodePreviousStatusFromReason(bill.cancelled_reason, fallbackStatus);
      const [itemRows] = await connection.execute(
        `SELECT bill_item_id, product_id, qty FROM bill_items WHERE bill_id = ?`,
        [billId]
      );

      if (restoreStatus === "CONFIRMED") {
        await applyBillStockEffect(connection, {
          bill: {
            bill_id: bill.bill_id,
            warehouse_id: bill.warehouse_id,
            team_id: bill.team_id,
            bill_type: bill.bill_type
          },
          items: itemRows,
          actorUserId: req.user.user_id,
          reverse: false
        });

        await connection.execute(
          `UPDATE bills
           SET status = 'CONFIRMED',
               confirmed_by = COALESCE(confirmed_by, ?),
               cancelled_by = NULL,
               cancelled_reason = NULL,
               updated_at = NOW()
           WHERE bill_id = ?`,
          [req.user.user_id, billId]
        );
      } else {
        await connection.execute(
          `UPDATE bills
           SET status = 'DRAFT',
               cancelled_by = NULL,
               cancelled_reason = NULL,
               updated_at = NOW()
           WHERE bill_id = ?`,
          [billId]
        );
      }

      await insertAudit(connection, {
        userId: req.user.user_id,
        action: "RESTORE_BILL",
        entity: "bills",
        entityId: billId,
        detail: {
          restored_to_status: restoreStatus
        }
      });

      return getBillDetailById(connection, billId);
    });

    res.json({ row });
  })
);

router.delete(
  "/:id/permanent",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const billId = Number(req.params.id);
    if (!Number.isFinite(billId) || billId <= 0) {
      throw new ApiError(400, "Invalid bill id");
    }

    await withTransaction(async (connection) => {
      const [billRows] = await connection.execute(
        `SELECT bill_id, bill_no, status FROM bills WHERE bill_id = ? FOR UPDATE`,
        [billId]
      );
      const bill = billRows[0];
      if (!bill) {
        throw new ApiError(404, "Bill not found");
      }
      if (bill.status !== "CANCELLED") {
        throw new ApiError(400, "Permanent delete is allowed only for cancelled bill");
      }

      await connection.execute(
        `DELETE FROM stock_movements WHERE bill_id = ?`,
        [billId]
      );
      await connection.execute(
        `DELETE FROM bill_items WHERE bill_id = ?`,
        [billId]
      );
      await connection.execute(
        `DELETE FROM bills WHERE bill_id = ?`,
        [billId]
      );

      await insertAudit(connection, {
        userId: req.user.user_id,
        action: "DELETE_BILL_PERMANENT",
        entity: "bills",
        entityId: billId,
        detail: {
          bill_no: bill.bill_no
        }
      });
    });

    res.json({ ok: true, bill_id: billId });
  })
);

export default router;
