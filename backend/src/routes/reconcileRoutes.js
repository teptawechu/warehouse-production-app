import { Router } from "express";
import multer from "multer";
import XLSX from "xlsx";
import { pool, withTransaction } from "../db.js";
import { requireRole } from "../middleware/auth.js";
import { asyncHandler, ApiError, parseDateRange } from "../utils/http.js";
import { insertAudit } from "../services/auditService.js";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 80 * 1024 * 1024 }
});

const DEFAULT_TEAM_COL = 8; // I
const DEFAULT_PRODUCT_COL = 9; // J
const DEFAULT_DESC_COL = 10; // K
const DEFAULT_QTY_COL = 11; // L
const DEFAULT_STATUS_COL = 18; // S

const TH_SYSTEM = "\u0E23\u0E30\u0E1A\u0E1A"; // ระบบ
const TH_QTY = "\u0E08\u0E33\u0E19\u0E27\u0E19"; // จำนวน

const TH_STATUS = "\u0E2A\u0E16\u0E32\u0E19\u0E30\u0E43\u0E1A\u0E40\u0E1A\u0E34\u0E01";
const TH_CIS_SENT = "\u0E2A\u0E48\u0E07\u0E44\u0E1B CIS \u0E41\u0E25\u0E49\u0E27";
const TH_CIS_PENDING = "\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E2A\u0E48\u0E07\u0E44\u0E1B CIS";

function round2(value) {
  return Number(Number(value || 0).toFixed(2));
}

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[._-]/g, "");
}

function toNumber(value) {
  const cleaned = String(value ?? "").replace(/,/g, "").replace(/#/g, "").trim();
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isNineDigitCode(value) {
  return /^\d{9}$/.test(String(value || "").trim());
}

function isCisSentStatus(value) {
  const target = normalize(TH_CIS_SENT);
  const current = normalize(value);
  if (!current) {
    return false;
  }
  return current.includes(target);
}

function isCisPendingStatus(value) {
  const target = normalize(TH_CIS_PENDING);
  const current = normalize(value);
  if (!current) {
    return false;
  }
  return current.includes(target);
}

function findHeaderRowIndex(rows) {
  const maxScan = Math.min(rows.length, 40);
  for (let i = 0; i < maxScan; i += 1) {
    const row = rows[i] || [];
    const productCell = String(row[DEFAULT_PRODUCT_COL] || "").trim();
    const qtyCells = [row[DEFAULT_QTY_COL], row[DEFAULT_QTY_COL + 1], row[DEFAULT_QTY_COL + 2]]
      .map((cell) => normalize(cell));
    const hasHeaderLikeProduct = productCell && !/^\d+$/.test(productCell);
    const hasQtyHeader = qtyCells.some(
      (cell) => cell.includes(normalize(TH_SYSTEM)) || cell.includes(normalize(TH_QTY)) || cell.includes("qty")
    );
    if (hasHeaderLikeProduct && hasQtyHeader) {
      return i;
    }
  }
  return 0;
}

function findColumnIndex(headers, keywords) {
  const normalizedHeaders = headers.map((header) => normalize(header));
  for (let i = 0; i < normalizedHeaders.length; i += 1) {
    if (!normalizedHeaders[i]) {
      continue;
    }
    if (keywords.some((keyword) => normalizedHeaders[i].includes(normalize(keyword)))) {
      return i;
    }
  }
  return -1;
}

function detectColumns(headers) {
  const teamIndex = headers.length > DEFAULT_TEAM_COL
    ? DEFAULT_TEAM_COL
    : findColumnIndex(headers, ["team"]);
  const productIndex = headers.length > DEFAULT_PRODUCT_COL
    ? DEFAULT_PRODUCT_COL
    : findColumnIndex(headers, ["product", "productcode", "product_id", "code"]);

  const systemIndex = findColumnIndex(headers, [TH_SYSTEM, "system"]);
  const qtyFallback = headers.length > DEFAULT_QTY_COL
    ? DEFAULT_QTY_COL
    : findColumnIndex(headers, [TH_QTY, "qty", "amount"]);
  const qtyIndex = systemIndex >= 0 ? systemIndex : qtyFallback;

  const productNameIndex = headers.length > DEFAULT_DESC_COL
    ? DEFAULT_DESC_COL
    : findColumnIndex(headers, ["description", "item", "name"]);

  if (teamIndex < 0 || productIndex < 0 || qtyIndex < 0) {
    throw new ApiError(400, "Cannot detect required columns (I/J/qty)");
  }

  return {
    teamIndex,
    productIndex,
    productNameIndex,
    qtyIndex
  };
}

function parseExcelRows(buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  if (!rawRows.length) {
    throw new ApiError(400, "Excel file has no rows");
  }

  const headerRowIndex = findHeaderRowIndex(rawRows);
  const headers = rawRows[headerRowIndex] || [];
  const columns = detectColumns(headers);

  const excelMap = new Map();
  for (let i = headerRowIndex + 1; i < rawRows.length; i += 1) {
    const row = rawRows[i] || [];
    const teamCode = String(row[columns.teamIndex] || "").trim().toUpperCase();
    const productCode = String(row[columns.productIndex] || "").replace(/\s+/g, "").trim();
    const productName = columns.productNameIndex >= 0
      ? String(row[columns.productNameIndex] || "").trim()
      : "";
    const qty = toNumber(row[columns.qtyIndex]);

    if (!teamCode || !isNineDigitCode(productCode) || qty === 0) {
      continue;
    }

    const key = `${teamCode}|${productCode}`;
    const current = excelMap.get(key) || {
      team_code: teamCode,
      product_code_wlma: productCode,
      product_name: productName || "-",
      system_qty: 0
    };
    current.system_qty = Number((current.system_qty + qty).toFixed(2));
    if ((!current.product_name || current.product_name === "-") && productName) {
      current.product_name = productName;
    }
    excelMap.set(key, current);
  }

  return {
    rows: [...excelMap.values()],
    sourceRows: rawRows.length,
    columnsDetected: {
      team_col: columns.teamIndex + 1,
      product_col: columns.productIndex + 1,
      qty_col: columns.qtyIndex + 1,
      product_name_col: columns.productNameIndex >= 0 ? columns.productNameIndex + 1 : null
    }
  };
}

function detectColumnsWlma(headers) {
  const productIndex = headers.length > DEFAULT_PRODUCT_COL
    ? DEFAULT_PRODUCT_COL
    : findColumnIndex(headers, ["product", "productcode", "product_id", "code"]);

  const systemIndex = findColumnIndex(headers, [TH_SYSTEM, "system"]);
  const qtyFallback = headers.length > DEFAULT_QTY_COL
    ? DEFAULT_QTY_COL
    : findColumnIndex(headers, [TH_QTY, "qty", "amount"]);
  const qtyIndex = systemIndex >= 0 ? systemIndex : qtyFallback;

  const productNameIndex = headers.length > DEFAULT_DESC_COL
    ? DEFAULT_DESC_COL
    : findColumnIndex(headers, ["description", "item", "name"]);

  const statusIndex = headers.length > DEFAULT_STATUS_COL
    ? DEFAULT_STATUS_COL
    : findColumnIndex(headers, [TH_STATUS, "status", "ใบเบิก"]);

  if (productIndex < 0 || qtyIndex < 0 || statusIndex < 0) {
    throw new ApiError(400, "Cannot detect required columns (J/qty/status)");
  }

  return {
    productIndex,
    productNameIndex,
    qtyIndex,
    statusIndex
  };
}

function parseExcelRowsWlma(buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  if (!rawRows.length) {
    throw new ApiError(400, "Excel file has no rows");
  }

  const headerRowIndex = findHeaderRowIndex(rawRows);
  const headers = rawRows[headerRowIndex] || [];
  const columns = detectColumnsWlma(headers);

  const excelMap = new Map();
  let filteredRows = 0;
  let pendingRows = 0;

  for (let i = headerRowIndex + 1; i < rawRows.length; i += 1) {
    const row = rawRows[i] || [];
    const productCode = String(row[columns.productIndex] || "").replace(/\s+/g, "").trim();
    const productName = columns.productNameIndex >= 0
      ? String(row[columns.productNameIndex] || "").trim()
      : "";
    const qty = toNumber(row[columns.qtyIndex]);
    const statusText = String(row[columns.statusIndex] || "").trim();

    if (!isNineDigitCode(productCode) || qty === 0) {
      continue;
    }
    const isSent = isCisSentStatus(statusText);

    const current = excelMap.get(productCode) || {
      product_code_wlma: productCode,
      product_name: productName || "-",
      system_qty: 0,
      pending_cis_qty: 0
    };
    const isPending = isCisPendingStatus(statusText);

    if (isSent) {
      current.system_qty = round2(current.system_qty + qty);
      filteredRows += 1;
    } else if (isPending) {
      current.pending_cis_qty = round2(current.pending_cis_qty + qty);
      pendingRows += 1;
    }
    if ((!current.product_name || current.product_name === "-") && productName) {
      current.product_name = productName;
    }
    excelMap.set(productCode, current);
  }

  return {
    rows: [...excelMap.values()],
    sourceRows: rawRows.length,
    filteredRows,
    pendingRows,
    columnsDetected: {
      product_col: columns.productIndex + 1,
      qty_col: columns.qtyIndex + 1,
      product_name_col: columns.productNameIndex >= 0 ? columns.productNameIndex + 1 : null,
      status_col: columns.statusIndex + 1
    }
  };
}

function makeNote(diffQty) {
  if (diffQty === 0) {
    return "MATCH";
  }
  if (diffQty > 0) {
    return "SYSTEM_MORE_THAN_NET";
  }
  return "NET_MORE_THAN_SYSTEM";
}

function decodeUploadedFilename(name) {
  const input = String(name || "");
  // Decode only when name looks like mojibake from latin1/utf8 mismatch.
  if (!/[ÃàâÐÑ]/.test(input)) {
    return input;
  }
  try {
    const decoded = Buffer.from(input, "latin1").toString("utf8");
    if (decoded.includes("\uFFFD")) {
      return input;
    }
    return decoded;
  } catch (_error) {
    return input;
  }
}

function sanitizeSheetName(value) {
  const base = String(value || "TEAM")
    .replace(/[\\/*?:[\]]/g, " ")
    .trim();
  const compact = base || "TEAM";
  return compact.slice(0, 31);
}

function buildUniqueSheetName(desiredName, usedNames) {
  const base = sanitizeSheetName(desiredName);
  if (!usedNames.has(base)) {
    usedNames.add(base);
    return base;
  }
  for (let i = 2; i <= 999; i += 1) {
    const suffix = `_${i}`;
    const candidate = `${base.slice(0, Math.max(1, 31 - suffix.length))}${suffix}`;
    if (!usedNames.has(candidate)) {
      usedNames.add(candidate);
      return candidate;
    }
  }
  const fallback = `${base.slice(0, 28)}_X`;
  usedNames.add(fallback);
  return fallback;
}

function groupRowsByTeam(rows) {
  const map = new Map();
  rows.forEach((row) => {
    const teamCode = String(row.team_code || "-").trim() || "-";
    const list = map.get(teamCode) || [];
    list.push(row);
    map.set(teamCode, list);
  });
  return map;
}

function toLegacyExportRow(row) {
  const output = {
    ทีม: String(row.team_code || "-"),
    รหัสวัสดุ: String(row.product_code_wlma || ""),
    รายการ: String(row.product_name || "-")
  };

  if (Object.prototype.hasOwnProperty.call(row, "system_qty")) {
    output["ระบบ (ไฟล์ตั้งต้น)"] = Number(row.system_qty || 0);
  }
  if (Object.prototype.hasOwnProperty.call(row, "issue_qty")) {
    output["กองงานเบิก (database)"] = Number(row.issue_qty || 0);
  }
  if (Object.prototype.hasOwnProperty.call(row, "return_qty")) {
    output["กองงานคืน (database)"] = Number(row.return_qty || 0);
  }
  if (Object.prototype.hasOwnProperty.call(row, "dataset_qty")) {
    output["สรุปเบิก = กองงานเบิก - กองงานคืน"] = Number(row.dataset_qty || 0);
  }
  if (Object.prototype.hasOwnProperty.call(row, "diff_qty")) {
    output["รวม = ระบบ - สรุปเบิก"] = Number(row.diff_qty || 0);
  }

  return output;
}

function toWlmaExportRow(mode, row) {
  const code = String(row.product_code_wlma || "");
  const name = String(row.product_name || "-");
  const systemQty = Number(row.system_qty || 0);
  const returnWlmaQty = Number(row.return_wlma_qty || 0);
  const pendingCisQty = Number(row.pending_cis_qty || 0);
  const gapQty = Number(row.gap_qty ?? round2(systemQty - returnWlmaQty));
  const finalGapQty = Number(row.final_gap_qty ?? round2(gapQty - pendingCisQty));

  if (mode === "source") {
    return {
      code_wlma: code,
      ชื่ออุปกรณ์: name,
      "ระบบ (ไฟล์ตั้งต้น)": systemQty,
      "ยังไม่ส่งไป CIS": pendingCisQty
    };
  }

  if (mode === "dataset") {
    return {
      code_wlma: code,
      ชื่ออุปกรณ์: name,
      "ในประปา(คืนจาก wlma)": returnWlmaQty
    };
  }

  return {
    code_wlma: code,
    ชื่ออุปกรณ์: name,
    "ระบบ (ไฟล์ตั้งต้น)": systemQty,
    "ในประปา(คืนจาก wlma)": returnWlmaQty,
    "ระบบ(ตั้งต้น) - ประปา": gapQty,
    "ยังไม่ส่งไป CIS": pendingCisQty,
    "(ระบบ - ในประปา) - ยังไม่ส่งไป CIS": finalGapQty,
    หมายเหตุ: ""
  };
}

router.post(
  "/upload",
  requireRole("ADMIN", "STOREKEEPER"),
  upload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new ApiError(400, "Excel file is required");
    }
    const originalName = decodeUploadedFilename(req.file.originalname);

    const warehouseId = Number(req.query.warehouse_id || 1);
    if (!Number.isFinite(warehouseId) || warehouseId <= 0) {
      throw new ApiError(400, "Invalid warehouse_id");
    }

    const reconcileModeRaw = String(req.query.reconcile_mode || req.query.mode || "legacy").toLowerCase();
    const reconcileMode = reconcileModeRaw === "wlma" ? "wlma" : reconcileModeRaw === "legacy" ? "legacy" : null;
    if (!reconcileMode) {
      throw new ApiError(400, "Invalid reconcile mode");
    }

    const parsedExcel = reconcileMode === "wlma"
      ? parseExcelRowsWlma(req.file.buffer)
      : parseExcelRows(req.file.buffer);
    const date = parseDateRange(req.query.from, req.query.to);
    let mergedRows = [];

    if (reconcileMode === "wlma") {
      const excelMap = new Map();
      parsedExcel.rows.forEach((row) => {
        excelMap.set(row.product_code_wlma, row);
      });

      const [wlmaRows] = await pool.execute(
        `SELECT p.product_code_wlma, p.product_name,
                SUM(bi.qty) AS return_wlma_qty
         FROM bills b
         JOIN bill_items bi ON bi.bill_id = b.bill_id
         JOIN products p ON p.product_id = bi.product_id
         WHERE b.status = 'CONFIRMED'
           AND b.warehouse_id = ?
           AND b.bill_type = 'RETURN_FROM_WLMA'
           ${date.clause}
         GROUP BY p.product_code_wlma, p.product_name`,
        [warehouseId, ...date.params]
      );
      const wlmaMap = new Map();
      wlmaRows.forEach((row) => {
        wlmaMap.set(row.product_code_wlma, {
          product_code_wlma: row.product_code_wlma,
          product_name: row.product_name,
          return_wlma_qty: Number(row.return_wlma_qty || 0)
        });
      });

      const allProductCodes = new Set([...excelMap.keys(), ...wlmaMap.keys()]);
      mergedRows = [...allProductCodes].map((productCode) => {
        const excel = excelMap.get(productCode);
        const wlma = wlmaMap.get(productCode);

        const systemQty = Number(excel?.system_qty || 0);
        const pendingCisQty = Number(excel?.pending_cis_qty || 0);
        const returnWlmaQty = Number(wlma?.return_wlma_qty || 0);
        const gapQty = round2(systemQty - returnWlmaQty);
        const finalGapQty = round2(gapQty - pendingCisQty);
        const diffQty = finalGapQty;

        return {
          team_code: "-",
          product_code_wlma: productCode,
          product_name: excel?.product_name || wlma?.product_name || "-",
          system_qty: systemQty,
          return_wlma_qty: returnWlmaQty,
          pending_cis_qty: pendingCisQty,
          gap_qty: gapQty,
          final_gap_qty: finalGapQty,
          diff_qty: diffQty,
          note: "",
          excel_qty: systemQty,
          app_qty: returnWlmaQty
        };
      });

      mergedRows.sort((a, b) => String(a.product_code_wlma).localeCompare(String(b.product_code_wlma), "en"));
    } else {
      const excelMap = new Map();
      parsedExcel.rows.forEach((row) => {
        const key = `${row.team_code}|${row.product_code_wlma}`;
        excelMap.set(key, row);
      });

      const [appRows] = await pool.execute(
        `SELECT t.team_code, p.product_code_wlma, p.product_name,
                SUM(CASE WHEN b.bill_type = 'ISSUE_TO_TEAM' THEN bi.qty ELSE 0 END) AS issue_qty,
                SUM(CASE WHEN b.bill_type = 'RETURN_FROM_TEAM' THEN bi.qty ELSE 0 END) AS return_qty
         FROM bills b
         JOIN bill_items bi ON bi.bill_id = b.bill_id
         JOIN teams t ON t.team_id = b.team_id
         JOIN products p ON p.product_id = bi.product_id
         WHERE b.status = 'CONFIRMED'
           AND b.warehouse_id = ?
           AND b.bill_type IN ('ISSUE_TO_TEAM', 'RETURN_FROM_TEAM')
           ${date.clause}
         GROUP BY t.team_code, p.product_code_wlma, p.product_name`,
        [warehouseId, ...date.params]
      );

      const appMap = new Map();
      appRows.forEach((row) => {
        const key = `${row.team_code}|${row.product_code_wlma}`;
        appMap.set(key, {
          team_code: row.team_code,
          product_code_wlma: row.product_code_wlma,
          product_name: row.product_name,
          issue_qty: Number(row.issue_qty || 0),
          return_qty: Number(row.return_qty || 0)
        });
      });

      const allKeys = new Set([...excelMap.keys(), ...appMap.keys()]);
      mergedRows = [...allKeys].map((key) => {
        const excel = excelMap.get(key);
        const app = appMap.get(key);

        const systemQty = Number(excel?.system_qty || 0);
        const issueQty = Number(app?.issue_qty || 0);
        const returnQty = Number(app?.return_qty || 0);
        const netQty = round2(issueQty - returnQty);
        const diffQty = round2(systemQty - netQty);

        return {
          team_code: excel?.team_code || app?.team_code || "-",
          product_code_wlma: excel?.product_code_wlma || app?.product_code_wlma || "-",
          product_name: excel?.product_name || app?.product_name || "-",
          system_qty: systemQty,
          issue_qty: issueQty,
          return_qty: returnQty,
          net_qty: netQty,
          diff_qty: diffQty,
          note: makeNote(diffQty),
          excel_qty: systemQty,
          app_qty: netQty
        };
      });

      mergedRows.sort((a, b) => {
        const teamDiff = String(a.team_code).localeCompare(String(b.team_code), "en");
        if (teamDiff !== 0) {
          return teamDiff;
        }
        return String(a.product_code_wlma).localeCompare(String(b.product_code_wlma), "en");
      });
    }

    const summary = {
      total_rows: mergedRows.length,
      match: mergedRows.filter((row) => row.diff_qty === 0).length,
      over_issue: mergedRows.filter((row) => row.diff_qty < 0).length,
      under_issue: mergedRows.filter((row) => row.diff_qty > 0).length
    };

    const reconcileRun = await withTransaction(async (connection) => {
      const [runResult] = await connection.execute(
        `INSERT INTO reconcile_runs (file_name, created_by, total_rows, started_at, finished_at)
         VALUES (?, ?, ?, NOW(), NOW())`,
        [originalName, req.user.user_id, mergedRows.length]
      );

      const runId = runResult.insertId;
      for (const row of mergedRows) {
        await connection.execute(
          `INSERT INTO reconcile_rows
           (reconcile_run_id, team_code, product_code_wlma, product_name, excel_qty, app_qty, diff_qty, note)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            runId,
            row.team_code,
            row.product_code_wlma,
            row.product_name,
            row.excel_qty,
            row.app_qty,
            row.diff_qty,
            row.note
          ]
        );
      }

      await insertAudit(connection, {
        userId: req.user.user_id,
        action: "RECONCILE_UPLOAD",
        entity: "reconcile_runs",
        entityId: runId,
        detail: {
          file_name: originalName,
          summary,
          warehouse_id: warehouseId,
          reconcile_mode: reconcileMode,
          filters: {
            from: req.query.from || null,
            to: req.query.to || null,
            status: reconcileMode === "wlma" ? TH_CIS_PENDING : null
          }
        }
      });

      return { reconcile_run_id: runId };
    });

    res.json({
      reconcile_run_id: reconcileRun.reconcile_run_id,
      file_name: originalName,
      reconcile_mode: reconcileMode,
      source_rows: parsedExcel.sourceRows,
      filtered_rows: parsedExcel.filteredRows ?? null,
      summary,
      rows: mergedRows,
      columns_detected: parsedExcel.columnsDetected
    });
  })
);

router.post(
  "/export",
  requireRole("ADMIN", "STOREKEEPER"),
  asyncHandler(async (req, res) => {
    const reconcileModeRaw = String(req.body?.reconcile_mode || "legacy").toLowerCase();
    const reconcileMode = reconcileModeRaw === "wlma" ? "wlma" : reconcileModeRaw === "legacy" ? "legacy" : null;
    if (!reconcileMode) {
      throw new ApiError(400, "Invalid reconcile mode");
    }

    const modeRaw = String(req.body?.mode || "").toLowerCase();
    const mode = modeRaw === "compare" ? "diff" : modeRaw;
    if (!["source", "dataset", "diff"].includes(mode)) {
      throw new ApiError(400, "Invalid export mode");
    }

    const incomingRows = Array.isArray(req.body?.rows) ? req.body.rows : [];
    if (!incomingRows.length) {
      throw new ApiError(400, "No rows to export");
    }
    if (incomingRows.length > 200000) {
      throw new ApiError(400, "Too many rows");
    }

    if (reconcileMode === "wlma") {
      const sourceMap = new Map();
      const wlmaMap = new Map();
      const fullMap = new Map();

      incomingRows.forEach((row) => {
        const productCode = String(row.product_code_wlma || "").trim();
        if (!productCode) {
          return;
        }
        const productName = String(row.product_name || "-");
        const systemQty = Number(row.system_qty ?? row.excel_qty ?? 0);
        const returnWlmaQty = Number(row.return_wlma_qty ?? 0);
        const pendingCisQty = Number(row.pending_cis_qty ?? 0);
        const gapQty = Number(row.gap_qty ?? round2(systemQty - returnWlmaQty));
        const finalGapQty = Number(row.final_gap_qty ?? round2(gapQty - pendingCisQty));

        if (systemQty !== 0 || pendingCisQty !== 0) {
          const current = sourceMap.get(productCode) || {
            product_code_wlma: productCode,
            product_name: productName,
            system_qty: 0,
            pending_cis_qty: 0
          };
          current.system_qty = round2(current.system_qty + systemQty);
          current.pending_cis_qty = round2(current.pending_cis_qty + pendingCisQty);
          if ((!current.product_name || current.product_name === "-") && productName) {
            current.product_name = productName;
          }
          sourceMap.set(productCode, current);
        }

        if (returnWlmaQty !== 0) {
          const current = wlmaMap.get(productCode) || {
            product_code_wlma: productCode,
            product_name: productName,
            return_wlma_qty: 0
          };
          current.return_wlma_qty = round2(current.return_wlma_qty + returnWlmaQty);
          if ((!current.product_name || current.product_name === "-") && productName) {
            current.product_name = productName;
          }
          wlmaMap.set(productCode, current);
        }

        const current = fullMap.get(productCode) || {
          product_code_wlma: productCode,
          product_name: productName,
          system_qty: 0,
          return_wlma_qty: 0,
          pending_cis_qty: 0,
          gap_qty: 0,
          final_gap_qty: 0,
          note: "MATCH"
        };
        current.system_qty = round2(current.system_qty + systemQty);
        current.return_wlma_qty = round2(current.return_wlma_qty + returnWlmaQty);
        current.pending_cis_qty = round2(current.pending_cis_qty + pendingCisQty);
        current.gap_qty = round2(current.gap_qty + gapQty);
        current.final_gap_qty = round2(current.final_gap_qty + finalGapQty);
        current.note = makeNote(current.final_gap_qty);
        if ((!current.product_name || current.product_name === "-") && productName) {
          current.product_name = productName;
        }
        fullMap.set(productCode, current);
      });

      const sourceRows = [...sourceMap.values()].sort((a, b) =>
        String(a.product_code_wlma).localeCompare(String(b.product_code_wlma), "en")
      );
      const wlmaRows = [...wlmaMap.values()].sort((a, b) =>
        String(a.product_code_wlma).localeCompare(String(b.product_code_wlma), "en")
      );
      const diffRows = [...fullMap.values()].sort((a, b) =>
        String(a.product_code_wlma).localeCompare(String(b.product_code_wlma), "en")
      );

      if (mode === "source" && !sourceRows.length) {
        throw new ApiError(400, "No source rows to export");
      }
      if (mode === "dataset" && !wlmaRows.length) {
        throw new ApiError(400, "No WLMA rows to export");
      }
      if (mode === "diff" && !diffRows.length) {
        throw new ApiError(400, "No WLMA reconcile rows to export");
      }

      const rowsForMode = mode === "source" ? sourceRows : mode === "dataset" ? wlmaRows : diffRows;
      const workbook = XLSX.utils.book_new();
      const sheetName = mode === "source" ? "SOURCE" : mode === "dataset" ? "WLMA_RETURNS" : "RECONCILE";
      const exportRows = rowsForMode.map((row) => toWlmaExportRow(mode, row));
      const summarySheet = XLSX.utils.json_to_sheet(exportRows);
      XLSX.utils.book_append_sheet(workbook, summarySheet, sheetName);

      const rawName = decodeUploadedFilename(String(req.body?.file_name || "reconcile.xlsx"));
      const base = rawName.replace(/\.[^.]+$/u, "").trim() || "reconcile";
      const outName = mode === "source"
        ? `${base}_WLMA_01_SOURCE.xlsx`
        : mode === "dataset"
          ? `${base}_WLMA_02_RETURNS.xlsx`
          : `${base}_WLMA_03_RECONCILE.xlsx`;

      const output = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
      res.setHeader(
        "Content-Disposition",
        `attachment; filename*=UTF-8''${encodeURIComponent(outName)}`
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.send(output);
      return;
    }

    const workbook = XLSX.utils.book_new();
    const usedSheetNames = new Set();

    const sourceRows = incomingRows
      .filter((row) => Number(row.system_qty ?? row.excel_qty ?? 0) !== 0)
      .map((row) => ({
        team_code: String(row.team_code || "-"),
        product_code_wlma: String(row.product_code_wlma || ""),
        product_name: String(row.product_name || "-"),
        system_qty: Number(row.system_qty ?? row.excel_qty ?? 0)
      }));

    const datasetRows = incomingRows
      .map((row) => ({
        team_code: String(row.team_code || "-"),
        product_code_wlma: String(row.product_code_wlma || ""),
        product_name: String(row.product_name || "-"),
        issue_qty: Number(row.issue_qty ?? 0),
        return_qty: Number(row.return_qty ?? 0),
        dataset_qty: Number(row.net_qty ?? row.app_qty ?? 0)
      }))
      .filter((row) => row.issue_qty !== 0 || row.return_qty !== 0 || row.dataset_qty !== 0);

    const datasetMap = new Map();
    datasetRows.forEach((row) => {
      datasetMap.set(`${row.team_code}|${row.product_code_wlma}`, row);
    });

    const sourceMap = new Map();
    sourceRows.forEach((row) => {
      sourceMap.set(`${row.team_code}|${row.product_code_wlma}`, row);
    });

    const allKeys = new Set([...sourceMap.keys(), ...datasetMap.keys()]);
    const diffRows = [...allKeys].map((key) => {
      const sourceRow = sourceMap.get(key);
      const datasetRow = datasetMap.get(key);
      const systemQty = Number(sourceRow?.system_qty || 0);
      const datasetQty = Number(datasetRow?.dataset_qty || 0);
      const issueQty = Number(datasetRow?.issue_qty || 0);
      const returnQty = Number(datasetRow?.return_qty || 0);
      const diffQty = Number((systemQty - datasetQty).toFixed(2));

      return {
        team_code: String(sourceRow?.team_code || datasetRow?.team_code || "-"),
        product_code_wlma: String(sourceRow?.product_code_wlma || datasetRow?.product_code_wlma || ""),
        product_name: String(sourceRow?.product_name || datasetRow?.product_name || "-"),
        system_qty: systemQty,
        issue_qty: issueQty,
        return_qty: returnQty,
        dataset_qty: datasetQty,
        diff_qty: diffQty
      };
    }).sort((a, b) => {
      const teamDiff = String(a.team_code).localeCompare(String(b.team_code), "en");
      if (teamDiff !== 0) {
        return teamDiff;
      }
      return String(a.product_code_wlma).localeCompare(String(b.product_code_wlma), "en");
    });

    if (mode === "source" && !sourceRows.length) {
      throw new ApiError(400, "No source rows to export");
    }
    if (mode === "dataset" && !datasetRows.length) {
      throw new ApiError(400, "No dataset rows to export");
    }
    if (mode === "diff" && !diffRows.length) {
      throw new ApiError(400, "No diff rows to export");
    }

    const rowsForMode = mode === "source"
      ? sourceRows
      : mode === "dataset"
        ? datasetRows
        : diffRows;

    const exportRows = rowsForMode.map((row) => toLegacyExportRow(row));
    const summarySheet = XLSX.utils.json_to_sheet(exportRows);
    if (mode === "diff") {
      XLSX.utils.sheet_add_aoa(
        summarySheet,
        [
          ["(+) = คืนให้กองงาน"],
          ["(-) = กองงานดึงไปคลัง"]
        ],
        { origin: "J2" }
      );
    }
    XLSX.utils.book_append_sheet(workbook, summarySheet, buildUniqueSheetName("ALL_TEAMS", usedSheetNames));

    const byTeam = groupRowsByTeam(rowsForMode);
    [...byTeam.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], "en"))
      .forEach(([teamCode, rows]) => {
        const teamSheet = XLSX.utils.json_to_sheet(rows.map((row) => toLegacyExportRow(row)));
        XLSX.utils.book_append_sheet(workbook, teamSheet, buildUniqueSheetName(teamCode, usedSheetNames));
      });

    const rawName = decodeUploadedFilename(String(req.body?.file_name || "reconcile.xlsx"));
    const base = rawName.replace(/\.[^.]+$/u, "").trim() || "reconcile";
    const outName = mode === "source"
      ? `${base}_TEAM_01_SOURCE.xlsx`
      : mode === "dataset"
        ? `${base}_TEAM_02_DATASET.xlsx`
        : `${base}_TEAM_03_RECONCILE.xlsx`;

    const output = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    res.setHeader(
      "Content-Disposition",
      `attachment; filename*=UTF-8''${encodeURIComponent(outName)}`
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.send(output);
  })
);

router.get(
  "/runs",
  requireRole("ADMIN", "STOREKEEPER"),
  asyncHandler(async (_req, res) => {
    const [rows] = await pool.execute(
      `SELECT r.reconcile_run_id, r.file_name, r.started_at, r.finished_at, r.total_rows,
              u.username, u.display_name
       FROM reconcile_runs r
       LEFT JOIN users u ON u.user_id = r.created_by
       ORDER BY r.reconcile_run_id DESC
       LIMIT 50`
    );
    res.json({ rows });
  })
);

router.get(
  "/runs/:id",
  requireRole("ADMIN", "STOREKEEPER"),
  asyncHandler(async (req, res) => {
    const runId = Number(req.params.id);
    if (!Number.isFinite(runId) || runId <= 0) {
      throw new ApiError(400, "Invalid reconcile run id");
    }

    const [headRows] = await pool.execute(
      `SELECT reconcile_run_id, file_name, started_at, finished_at, total_rows
       FROM reconcile_runs
       WHERE reconcile_run_id = ?`,
      [runId]
    );
    if (!headRows.length) {
      throw new ApiError(404, "Reconcile run not found");
    }

    const [rows] = await pool.execute(
      `SELECT reconcile_row_id, team_code, product_code_wlma, product_name, excel_qty, app_qty, diff_qty, note
       FROM reconcile_rows
       WHERE reconcile_run_id = ?
       ORDER BY team_code ASC, product_code_wlma ASC`,
      [runId]
    );

    res.json({
      run: headRows[0],
      rows
    });
  })
);

export default router;
