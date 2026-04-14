import { Router } from "express";
import { pool } from "../db.js";
import { asyncHandler } from "../utils/http.js";

const router = Router();

router.get(
  "/summary",
  asyncHandler(async (req, res) => {
    const warehouseId = Number(req.query.warehouse_id || 1);

    const [[counts]] = await pool.execute(
      `SELECT
         SUM(CASE WHEN bill_datetime >= DATE_SUB(NOW(), INTERVAL 1 DAY) THEN 1 ELSE 0 END) AS confirmed_1d,
         SUM(CASE WHEN bill_datetime >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) AS confirmed_7d,
         COUNT(*) AS confirmed_30d
       FROM bills
       WHERE warehouse_id = ?
         AND status = 'CONFIRMED'
         AND bill_datetime >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
      [warehouseId]
    );

    const [lowStockRows] = await pool.execute(
      `SELECT p.product_id, p.product_code_wlma, p.product_name, p.unit, p.reorder_level,
              COALESCE(ps.qty_on_hand, 0) AS qty_on_hand
       FROM products p
       LEFT JOIN product_stocks ps
         ON ps.product_id = p.product_id
        AND ps.warehouse_id = ?
       WHERE p.is_active = 1
         AND COALESCE(ps.qty_on_hand, 0) <= p.reorder_level
       ORDER BY COALESCE(ps.qty_on_hand, 0) ASC, p.product_code_wlma ASC
       LIMIT 30`,
      [warehouseId]
    );

    const [recentRows] = await pool.execute(
      `SELECT b.bill_id, b.bill_no, b.bill_datetime, b.bill_type, b.status, t.team_code, t.team_name
       FROM bills b
       LEFT JOIN teams t ON t.team_id = b.team_id
       WHERE b.warehouse_id = ?
       ORDER BY b.bill_datetime DESC
       LIMIT 10`,
      [warehouseId]
    );

    res.json({
      counts: {
        confirmed_1d: Number(counts.confirmed_1d || 0),
        confirmed_7d: Number(counts.confirmed_7d || 0),
        confirmed_30d: Number(counts.confirmed_30d || 0)
      },
      low_stock: lowStockRows,
      recent_bills: recentRows
    });
  })
);

export default router;
