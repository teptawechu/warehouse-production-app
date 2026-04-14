import "dotenv/config";
import mysql from "mysql2/promise";

function parseArgs(argv) {
  const map = new Map();
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      continue;
    }
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      map.set(key, "true");
      continue;
    }
    map.set(key, next);
    i += 1;
  }
  return map;
}

function asBoolean(value, fallback = false) {
  if (value == null) {
    return fallback;
  }
  const raw = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "y"].includes(raw)) {
    return true;
  }
  if (["0", "false", "no", "n"].includes(raw)) {
    return false;
  }
  return fallback;
}

async function main() {
  const args = parseArgs(process.argv);
  const tag = String(args.get("tag") || "[AUTO_TEST_RANDOM]").trim();
  const dryRun = asBoolean(args.get("dry-run"), false);
  const likePattern = `${tag}%`;

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "warehouse_app"
  });

  try {
    const [billCountRows] = await connection.execute(
      `SELECT COUNT(*) AS total FROM bills WHERE remarks LIKE ?`,
      [likePattern]
    );
    const fakeBillCount = Number(billCountRows?.[0]?.total || 0);
    if (!fakeBillCount) {
      console.log(`No bills matched tag prefix "${tag}".`);
      return;
    }

    const [previewRows] = await connection.execute(
      `SELECT bill_id, bill_no, status, bill_datetime
       FROM bills
       WHERE remarks LIKE ?
       ORDER BY bill_id DESC
       LIMIT 10`,
      [likePattern]
    );

    const [movementCountRows] = await connection.execute(
      `SELECT COUNT(*) AS total
       FROM stock_movements sm
       JOIN bills b ON b.bill_id = sm.bill_id
       WHERE b.remarks LIKE ?`,
      [likePattern]
    );
    const fakeMovementCount = Number(movementCountRows?.[0]?.total || 0);

    console.log(`Matched fake bills: ${fakeBillCount}`);
    console.log(`Matched stock movements: ${fakeMovementCount}`);
    console.log("Latest matched bills (up to 10):");
    previewRows.forEach((row) => {
      console.log(`- ${row.bill_id} | ${row.bill_no} | ${row.status} | ${row.bill_datetime}`);
    });

    if (dryRun) {
      console.log("Dry run mode: no data changed.");
      return;
    }

    await connection.beginTransaction();
    try {
      await connection.execute(
        `UPDATE product_stocks ps
         JOIN (
           SELECT sm.warehouse_id, sm.product_id,
                  SUM(CASE WHEN sm.movement_type = 'IN' THEN sm.qty ELSE -sm.qty END) AS net_delta
           FROM stock_movements sm
           JOIN bills b ON b.bill_id = sm.bill_id
           WHERE b.remarks LIKE ?
           GROUP BY sm.warehouse_id, sm.product_id
         ) d
           ON d.warehouse_id = ps.warehouse_id
          AND d.product_id = ps.product_id
         SET ps.qty_on_hand = ps.qty_on_hand - d.net_delta`,
        [likePattern]
      );

      const [deletedMovementsResult] = await connection.execute(
        `DELETE sm
         FROM stock_movements sm
         JOIN bills b ON b.bill_id = sm.bill_id
         WHERE b.remarks LIKE ?`,
        [likePattern]
      );

      const [deletedAuditsResult] = await connection.execute(
        `DELETE a
         FROM audit_logs a
         JOIN bills b
           ON a.entity = 'bills'
          AND a.entity_id = CAST(b.bill_id AS CHAR)
         WHERE b.remarks LIKE ?`,
        [likePattern]
      );

      const [deletedBillsResult] = await connection.execute(
        `DELETE FROM bills WHERE remarks LIKE ?`,
        [likePattern]
      );

      await connection.commit();
      console.log(`Deleted stock movements: ${deletedMovementsResult.affectedRows}`);
      console.log(`Deleted bill audits: ${deletedAuditsResult.affectedRows}`);
      console.log(`Deleted bills: ${deletedBillsResult.affectedRows}`);
      console.log("Cleanup completed.");
    } catch (error) {
      await connection.rollback();
      throw error;
    }
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
