import { Router } from "express";
import { z } from "zod";
import { pool, withTransaction } from "../db.js";
import { requireRole } from "../middleware/auth.js";
import { asyncHandler, ApiError } from "../utils/http.js";
import { insertAudit } from "../services/auditService.js";

const router = Router();

const createProductSchema = z.object({
  product_code_wlma: z.string().min(2).max(60),
  product_name: z.string().min(2).max(255),
  unit: z.string().min(1).max(30),
  reorder_level: z.number().nonnegative().default(0),
  is_active: z.boolean().default(true)
});

const updateProductSchema = z.object({
  product_code_wlma: z.string().min(2).max(60).optional(),
  product_name: z.string().min(2).max(255).optional(),
  unit: z.string().min(1).max(30).optional(),
  reorder_level: z.number().nonnegative().optional(),
  is_active: z.boolean().optional()
});

const adjustStockSchema = z.object({
  warehouse_id: z.coerce.number().int().positive(),
  direction: z.enum(["IN", "OUT"]),
  qty: z.coerce.number().positive(),
  remark: z.string().min(1).max(1000)
});

function parseAsOfDatetime(rawValue) {
  const value = String(rawValue || "").trim();
  if (!value) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/u.test(value)) {
    return `${value} 23:59:59`;
  }

  const normalized = value.replace("T", " ");
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/u.test(normalized)) {
    return `${normalized}:59`;
  }
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/u.test(normalized)) {
    return normalized;
  }

  throw new ApiError(400, "Invalid as_of datetime");
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const search = req.query.search ? String(req.query.search).trim() : "";
    const status = req.query.status ? String(req.query.status).toLowerCase() : "all";
    const warehouseId = Number(req.query.warehouse_id || 1);
    const asOf = parseAsOfDatetime(req.query.as_of);

    if (!Number.isFinite(warehouseId) || warehouseId <= 0) {
      throw new ApiError(400, "Invalid warehouse_id");
    }

    const innerWhere = ["p.is_active = 1"];
    const outerWhere = [];
    const params = [];

    if (status === "out") {
      outerWhere.push("q.qty_on_hand <= 0");
    } else if (status === "low") {
      outerWhere.push("q.qty_on_hand > 0 AND q.qty_on_hand <= q.reorder_level");
    } else if (status === "healthy") {
      outerWhere.push("q.qty_on_hand > q.reorder_level");
    }

    const movementTodayExpr = `COALESCE((
          SELECT SUM(sm.qty)
          FROM stock_movements sm
          WHERE sm.warehouse_id = ?
            AND sm.product_id = p.product_id
            AND sm.movement_datetime >= CURRENT_DATE()
            AND sm.movement_datetime < DATE_ADD(CURRENT_DATE(), INTERVAL 1 DAY)
        ), 0)`;

    let qtyExpr = "COALESCE(ps.qty_on_hand, 0)";
    let fromClause = `FROM products p
       LEFT JOIN product_stocks ps
         ON ps.product_id = p.product_id
        AND ps.warehouse_id = ?`;

    if (asOf) {
      qtyExpr = `COALESCE((
          SELECT sm.balance_after
          FROM stock_movements sm
          WHERE sm.warehouse_id = ?
            AND sm.product_id = p.product_id
            AND sm.movement_datetime <= ?
          ORDER BY sm.movement_datetime DESC, sm.movement_id DESC
          LIMIT 1
        ), 0)`;
      fromClause = "FROM products p";
      params.push(warehouseId, asOf);
    } else {
      params.push(warehouseId);
    }
    params.push(warehouseId);

    if (search) {
      innerWhere.push("(p.product_code_wlma LIKE ? OR p.product_name LIKE ?)");
      const keyword = `%${search}%`;
      params.push(keyword, keyword);
    }

    const sql = `SELECT q.product_id, q.product_code_wlma, q.product_name, q.unit, q.reorder_level, q.is_active,
                        q.qty_on_hand, q.movement_today_qty, q.created_at, q.updated_at
                 FROM (
                   SELECT p.product_id, p.product_code_wlma, p.product_name, p.unit, p.reorder_level, p.is_active,
                          ${qtyExpr} AS qty_on_hand,
                          ${movementTodayExpr} AS movement_today_qty,
                          p.created_at, p.updated_at
                   ${fromClause}
                   WHERE ${innerWhere.join(" AND ")}
                 ) q
                 ${outerWhere.length ? `WHERE ${outerWhere.join(" AND ")}` : ""}
                 ORDER BY q.product_code_wlma ASC`;

    const [rows] = await pool.execute(sql, params);

    res.json({ rows, as_of: asOf });
  })
);

router.post(
  "/:id/adjust-stock",
  requireRole("ADMIN", "STOREKEEPER"),
  asyncHandler(async (req, res) => {
    const productId = Number(req.params.id);
    if (!Number.isFinite(productId) || productId <= 0) {
      throw new ApiError(400, "Invalid product id");
    }

    const parsed = adjustStockSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(400, "Invalid payload");
    }
    const payload = {
      ...parsed.data,
      remark: String(parsed.data.remark || "").trim()
    };
    const recorderName = String(req.user?.display_name || req.user?.username || "").trim();
    if (!recorderName || !payload.remark) {
      throw new ApiError(400, "recorder_name and remark are required");
    }

    const row = await withTransaction(async (connection) => {
      const [warehouseRows] = await connection.execute(
        `SELECT warehouse_id FROM warehouses WHERE warehouse_id = ? AND is_active = 1`,
        [payload.warehouse_id]
      );
      if (!warehouseRows.length) {
        throw new ApiError(400, "Warehouse not found or inactive");
      }

      const [productRows] = await connection.execute(
        `SELECT product_id, product_code_wlma, product_name
         FROM products
         WHERE product_id = ? AND is_active = 1`,
        [productId]
      );
      if (!productRows.length) {
        throw new ApiError(404, "Product not found");
      }
      const product = productRows[0];

      await connection.execute(
        `INSERT INTO product_stocks (warehouse_id, product_id, qty_on_hand)
         VALUES (?, ?, 0)
         ON DUPLICATE KEY UPDATE qty_on_hand = qty_on_hand`,
        [payload.warehouse_id, productId]
      );

      const [stockRows] = await connection.execute(
        `SELECT qty_on_hand
         FROM product_stocks
         WHERE warehouse_id = ? AND product_id = ?
         FOR UPDATE`,
        [payload.warehouse_id, productId]
      );

      const currentQty = Number(stockRows[0]?.qty_on_hand || 0);
      let nextQty = currentQty;
      if (payload.direction === "OUT") {
        if (currentQty < payload.qty) {
          throw new ApiError(
            400,
            `Insufficient stock for product_id ${productId}. On hand ${currentQty}, requested ${payload.qty}`
          );
        }
        nextQty = currentQty - payload.qty;
      } else {
        nextQty = currentQty + payload.qty;
      }

      await connection.execute(
        `UPDATE product_stocks
         SET qty_on_hand = ?, updated_at = NOW()
         WHERE warehouse_id = ? AND product_id = ?`,
        [nextQty, payload.warehouse_id, productId]
      );

      await insertAudit(connection, {
        userId: req.user.user_id,
        action: "ADJUST_PRODUCT_STOCK",
        entity: "products",
        entityId: productId,
        detail: {
          warehouse_id: payload.warehouse_id,
          direction: payload.direction,
          qty: payload.qty,
          qty_before: currentQty,
          qty_after: nextQty,
          recorder_name: recorderName,
          remark: payload.remark
        }
      });

      return {
        product_id: productId,
        product_code_wlma: product.product_code_wlma,
        product_name: product.product_name,
        warehouse_id: payload.warehouse_id,
        direction: payload.direction,
        qty: payload.qty,
        recorder_name: recorderName,
        qty_before: currentQty,
        qty_after: nextQty
      };
    });

    res.json({ row });
  })
);

router.post(
  "/",
  requireRole("ADMIN", "STOREKEEPER"),
  asyncHandler(async (req, res) => {
    const parsed = createProductSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(400, "Invalid payload");
    }
    const payload = parsed.data;

    const row = await withTransaction(async (connection) => {
      const [existsRows] = await connection.execute(
        `SELECT product_id FROM products WHERE product_code_wlma = ?`,
        [payload.product_code_wlma]
      );
      if (existsRows.length) {
        throw new ApiError(409, "Product code already exists");
      }

      const [result] = await connection.execute(
        `INSERT INTO products (product_code_wlma, product_name, unit, reorder_level, is_active)
         VALUES (?, ?, ?, ?, ?)`,
        [
          payload.product_code_wlma,
          payload.product_name,
          payload.unit,
          payload.reorder_level,
          payload.is_active ? 1 : 0
        ]
      );

      await connection.execute(
        `INSERT INTO product_stocks (warehouse_id, product_id, qty_on_hand)
         SELECT warehouse_id, ?, 0 FROM warehouses
         ON DUPLICATE KEY UPDATE qty_on_hand = qty_on_hand`,
        [result.insertId]
      );

      await insertAudit(connection, {
        userId: req.user.user_id,
        action: "CREATE_PRODUCT",
        entity: "products",
        entityId: result.insertId,
        detail: payload
      });

      const [rows] = await connection.execute(
        `SELECT product_id, product_code_wlma, product_name, unit, reorder_level, is_active, created_at, updated_at
         FROM products WHERE product_id = ?`,
        [result.insertId]
      );
      return rows[0];
    });

    res.status(201).json({ row });
  })
);

router.patch(
  "/:id",
  requireRole("ADMIN", "STOREKEEPER"),
  asyncHandler(async (req, res) => {
    const productId = Number(req.params.id);
    if (!Number.isFinite(productId) || productId <= 0) {
      throw new ApiError(400, "Invalid product id");
    }

    const parsed = updateProductSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(400, "Invalid payload");
    }
    const payload = parsed.data;
    if (!Object.keys(payload).length) {
      throw new ApiError(400, "No fields to update");
    }

    const row = await withTransaction(async (connection) => {
      const [existsRows] = await connection.execute(
        `SELECT product_id FROM products WHERE product_id = ?`,
        [productId]
      );
      if (!existsRows.length) {
        throw new ApiError(404, "Product not found");
      }

      const updates = [];
      const params = [];

      if (payload.product_code_wlma !== undefined) {
        updates.push("product_code_wlma = ?");
        params.push(payload.product_code_wlma);
      }
      if (payload.product_name !== undefined) {
        updates.push("product_name = ?");
        params.push(payload.product_name);
      }
      if (payload.unit !== undefined) {
        updates.push("unit = ?");
        params.push(payload.unit);
      }
      if (payload.reorder_level !== undefined) {
        updates.push("reorder_level = ?");
        params.push(payload.reorder_level);
      }
      if (payload.is_active !== undefined) {
        updates.push("is_active = ?");
        params.push(payload.is_active ? 1 : 0);
      }

      params.push(productId);

      await connection.execute(
        `UPDATE products SET ${updates.join(", ")} WHERE product_id = ?`,
        params
      );

      await insertAudit(connection, {
        userId: req.user.user_id,
        action: "UPDATE_PRODUCT",
        entity: "products",
        entityId: productId,
        detail: payload
      });

      const [rows] = await connection.execute(
        `SELECT product_id, product_code_wlma, product_name, unit, reorder_level, is_active, created_at, updated_at
         FROM products WHERE product_id = ?`,
        [productId]
      );
      return rows[0];
    });

    res.json({ row });
  })
);

export default router;
