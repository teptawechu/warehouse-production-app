import fs from "fs";
import path from "path";
import mysql from "mysql2/promise";
import { fileURLToPath } from "url";
import { config } from "../src/config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const schemaPath = path.resolve(__dirname, "../db/schema.sql");

async function main() {
  const sql = fs.readFileSync(schemaPath, "utf-8");
  const connection = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    multipleStatements: true
  });
  await connection.query(sql);
  await connection.end();
  // eslint-disable-next-line no-console
  console.log("Database schema initialized.");
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exitCode = 1;
});
