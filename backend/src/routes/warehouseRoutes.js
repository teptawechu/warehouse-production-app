import { Router } from "express";
import { pool } from "../db.js";
import { asyncHandler } from "../utils/http.js";

const router = Router();

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const [rows] = await pool.execute(
      `SELECT warehouse_id, warehouse_code, warehouse_name, is_active, created_at, updated_at
       FROM warehouses
       WHERE is_active = 1
       ORDER BY warehouse_code ASC`
    );
    res.json({ rows });
  })
);

export default router;
