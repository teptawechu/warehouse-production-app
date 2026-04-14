import fs from "fs";
import XLSX from "xlsx";
import { pool, withTransaction } from "../src/db.js";

const DEFAULT_PATH = "D:/Dowloads_2/MaterialPrice_2567_table_full.xlsx";

function cleanText(value) {
  return String(value ?? "").trim();
}

function parseRows(filePath) {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: ""
  });

  let startIndex = 1;
  for (let i = 0; i < rows.length; i += 1) {
    const rowText = rows[i].map((cell) => cleanText(cell)).join("|");
    if (rowText.includes("รหัสวัสดุ") && rowText.includes("ชื่อรายการ")) {
      startIndex = i + 1;
      break;
    }
  }

  const items = [];
  for (let i = startIndex; i < rows.length; i += 1) {
    const row = rows[i];
    const code = cleanText(row[1]);
    const name = cleanText(row[2]);
    const unit = cleanText(row[3] || "EA");
    if (!code || !name) {
      continue;
    }
    items.push({
      product_code_wlma: code,
      product_name: name,
      unit
    });
  }

  const uniqueMap = new Map();
  items.forEach((item) => {
    uniqueMap.set(item.product_code_wlma, item);
  });
  return [...uniqueMap.values()];
}

async function main() {
  const filePath = process.argv[2] || process.env.PRODUCT_EXCEL_PATH || DEFAULT_PATH;
  if (!fs.existsSync(filePath)) {
    throw new Error(`Excel file not found: ${filePath}`);
  }

  const products = parseRows(filePath);
  if (!products.length) {
    throw new Error("No products parsed from excel file");
  }

  await withTransaction(async (connection) => {
    const [warehouseRows] = await connection.execute(
      `SELECT warehouse_id FROM warehouses WHERE is_active = 1 ORDER BY warehouse_id`
    );
    if (!warehouseRows.length) {
      throw new Error("No active warehouses. Seed warehouse first.");
    }
    const warehouseIds = warehouseRows.map((item) => Number(item.warehouse_id));

    for (const product of products) {
      await connection.execute(
        `INSERT INTO products (product_code_wlma, product_name, unit, reorder_level, is_active)
         VALUES (?, ?, ?, 0, 1)
         ON DUPLICATE KEY UPDATE
           product_name = VALUES(product_name),
           unit = VALUES(unit),
           is_active = 1`,
        [product.product_code_wlma, product.product_name, product.unit]
      );

      const [productRows] = await connection.execute(
        `SELECT product_id FROM products WHERE product_code_wlma = ? LIMIT 1`,
        [product.product_code_wlma]
      );
      const productId = Number(productRows[0].product_id);

      for (const warehouseId of warehouseIds) {
        await connection.execute(
          `INSERT INTO product_stocks (warehouse_id, product_id, qty_on_hand)
           VALUES (?, ?, 0)
           ON DUPLICATE KEY UPDATE qty_on_hand = qty_on_hand`,
          [warehouseId, productId]
        );
      }
    }
  });

  // eslint-disable-next-line no-console
  console.log(`Imported ${products.length} products from ${filePath}`);
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
