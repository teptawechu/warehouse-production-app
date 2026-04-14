import { Router } from "express";
import { pool } from "../db.js";
import { asyncHandler } from "../utils/http.js";
import { requireRole } from "../middleware/auth.js";

const router = Router();

router.get(
  "/",
  requireRole("ADMIN", "STOREKEEPER"),
  asyncHandler(async (req, res) => {
    const rawLimit = Number(req.query.limit);
    const safeLimit = Number.isFinite(rawLimit) ? Math.floor(rawLimit) : 200;
    const limit = Math.min(Math.max(safeLimit, 1), 1000);
    const [rows] = await pool.execute(
      `SELECT a.audit_id, a.action, a.entity, a.entity_id, a.detail_json, a.created_at,
              u.user_id, u.username, u.display_name
       FROM audit_logs a
       LEFT JOIN users u ON u.user_id = a.user_id
       ORDER BY a.audit_id DESC
       LIMIT ${limit}`
    );
    res.json({ rows });
  })
);

export default router;
