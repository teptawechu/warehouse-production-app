import bcrypt from "bcryptjs";
import { pool } from "../src/db.js";
import { config } from "../src/config.js";

async function main() {
  const hash = await bcrypt.hash(config.admin.password, 10);
  await pool.execute(
    `INSERT INTO users (username, password_hash, display_name, role, is_active)
     VALUES (?, ?, ?, 'ADMIN', 1)
     ON DUPLICATE KEY UPDATE
       password_hash = VALUES(password_hash),
       display_name = VALUES(display_name),
       role = 'ADMIN',
       is_active = 1`,
    [config.admin.username, hash, config.admin.displayName]
  );
  // eslint-disable-next-line no-console
  console.log(`Admin user ensured: ${config.admin.username}`);
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
