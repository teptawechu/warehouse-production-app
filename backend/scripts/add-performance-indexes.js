import { pool } from "../src/db.js";

const indexes = [
  {
    table: "bills",
    name: "idx_bills_warehouse_datetime",
    ddl: "CREATE INDEX idx_bills_warehouse_datetime ON bills (warehouse_id, bill_datetime)"
  },
  {
    table: "bills",
    name: "idx_bills_warehouse_status_datetime",
    ddl: "CREATE INDEX idx_bills_warehouse_status_datetime ON bills (warehouse_id, status, bill_datetime)"
  },
  {
    table: "bills",
    name: "idx_bills_team_status_type_datetime",
    ddl: "CREATE INDEX idx_bills_team_status_type_datetime ON bills (team_id, status, bill_type, bill_datetime)"
  },
  {
    table: "stock_movements",
    name: "idx_movements_wh_product_datetime",
    ddl: "CREATE INDEX idx_movements_wh_product_datetime ON stock_movements (warehouse_id, product_id, movement_datetime, movement_id)"
  }
];

async function ensureIndex(item) {
  const [rows] = await pool.execute(
    `SELECT 1
     FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND INDEX_NAME = ?
     LIMIT 1`,
    [item.table, item.name]
  );
  if (rows.length) {
    // eslint-disable-next-line no-console
    console.log(`Skip existing index: ${item.name}`);
    return;
  }

  await pool.execute(item.ddl);
  // eslint-disable-next-line no-console
  console.log(`Created index: ${item.name}`);
}

async function main() {
  for (const item of indexes) {
    await ensureIndex(item);
  }
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });

