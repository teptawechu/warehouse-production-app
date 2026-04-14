import { pool } from "../src/db.js";

async function main() {
  await pool.execute(
    `INSERT INTO warehouses (warehouse_code, warehouse_name, is_active)
     VALUES ('WH01', 'Main Warehouse', 1)
     ON DUPLICATE KEY UPDATE warehouse_name = VALUES(warehouse_name), is_active = 1`
  );
  // eslint-disable-next-line no-console
  console.log("Default warehouse seeded.");
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
