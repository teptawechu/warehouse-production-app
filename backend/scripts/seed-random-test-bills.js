import "dotenv/config";
import mysql from "mysql2/promise";

const API_BASE = process.env.API_BASE || `http://127.0.0.1:${process.env.PORT || 5000}/api`;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin01";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

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

function intArg(args, key, fallback) {
  const raw = args.get(key);
  if (raw == null) {
    return fallback;
  }
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function boolArg(args, key, fallback = false) {
  const raw = args.get(key);
  if (raw == null) {
    return fallback;
  }
  const value = String(raw).trim().toLowerCase();
  if (["1", "true", "yes", "y"].includes(value)) {
    return true;
  }
  if (["0", "false", "no", "n"].includes(value)) {
    return false;
  }
  return fallback;
}

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function pickDistinct(list, count) {
  if (count >= list.length) {
    return [...list];
  }
  const copy = [...list];
  const out = [];
  while (out.length < count && copy.length) {
    const idx = Math.floor(Math.random() * copy.length);
    out.push(copy[idx]);
    copy.splice(idx, 1);
  }
  return out;
}

function randomQtyByType(type) {
  if (type === "RETURN_FROM_WLMA") {
    return Math.floor(Math.random() * 41) + 10; // 10..50
  }
  return Math.floor(Math.random() * 7) + 1; // 1..7
}

function randomDatetimeBetween(fromDate, toDate) {
  const fromMs = fromDate.getTime();
  const toMs = toDate.getTime();
  const min = Math.min(fromMs, toMs);
  const max = Math.max(fromMs, toMs);
  const value = min + Math.floor(Math.random() * (max - min + 1));
  return new Date(value);
}

function formatMysqlDatetime(date) {
  const pad = (v) => String(v).padStart(2, "0");
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
}

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.message || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

async function loginAndGetToken() {
  const data = await apiFetch("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: ADMIN_USERNAME,
      password: ADMIN_PASSWORD
    })
  });
  return data.token;
}

async function createBill(token, payload) {
  return apiFetch("/bills", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
}

async function main() {
  const args = parseArgs(process.argv);
  const warehouseId = intArg(args, "warehouse", 1);
  const billCount = intArg(args, "count", 120);
  const itemsPerBill = intArg(args, "items", 15);
  const fromDate = new Date(args.get("from") || "2025-10-01");
  const toDate = new Date(args.get("to") || new Date().toISOString().slice(0, 10));
  const skipDbTimeRandomize = boolArg(args, "skip-db-time", false);

  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    throw new Error("Invalid --from or --to date. Use YYYY-MM-DD");
  }

  const token = await loginAndGetToken();
  const authHeaders = { Authorization: `Bearer ${token}` };

  const [teamsData, productsData] = await Promise.all([
    apiFetch("/teams", { headers: authHeaders }),
    apiFetch(`/products?warehouse_id=${warehouseId}&status=all`, { headers: authHeaders })
  ]);

  const teams = (teamsData.rows || []).filter((row) => row.is_active);
  const products = productsData.rows || [];

  if (!products.length) {
    throw new Error("No products found. Please import products first.");
  }
  if (!teams.length) {
    throw new Error("No active teams found.");
  }

  const createdBillIds = [];
  let created = 0;
  let skipped = 0;

  // Preload stock with WLMA return so ISSUE_TO_TEAM can pass stock checks.
  const preloadRounds = Math.max(20, Math.floor(billCount * 0.25));
  for (let i = 0; i < preloadRounds; i += 1) {
    const selected = pickDistinct(products, Math.min(itemsPerBill, products.length));
    const items = selected.map((p) => ({
      product_id: Number(p.product_id),
      qty: randomQtyByType("RETURN_FROM_WLMA")
    }));
    const payload = {
      bill_type: "RETURN_FROM_WLMA",
      warehouse_id: warehouseId,
      team_id: null,
      sender_name: "WLMA",
      receiver_name: "คลังทดสอบ",
      remarks: "[AUTO_TEST_RANDOM] preload",
      auto_confirm: true,
      items
    };
    try {
      const result = await createBill(token, payload);
      createdBillIds.push(Number(result.row.bill_id));
      created += 1;
    } catch (_error) {
      skipped += 1;
    }
  }

  for (let i = 0; i < billCount; i += 1) {
    const roll = Math.random();
    const type = roll < 0.45
      ? "ISSUE_TO_TEAM"
      : roll < 0.8
        ? "RETURN_FROM_TEAM"
        : "RETURN_FROM_WLMA";

    const team = pickRandom(teams);
    const selected = pickDistinct(products, Math.min(itemsPerBill, products.length));
    const items = selected.map((p) => ({
      product_id: Number(p.product_id),
      qty: randomQtyByType(type)
    }));

    const payload = {
      bill_type: type,
      warehouse_id: warehouseId,
      team_id: type === "RETURN_FROM_WLMA" ? null : Number(team.team_id),
      sender_name: type === "ISSUE_TO_TEAM" ? "คลังทดสอบ" : type === "RETURN_FROM_TEAM" ? team.team_code : "WLMA",
      receiver_name: type === "ISSUE_TO_TEAM" ? team.team_code : "คลังทดสอบ",
      remarks: "[AUTO_TEST_RANDOM] mixed",
      auto_confirm: true,
      items
    };

    try {
      const result = await createBill(token, payload);
      createdBillIds.push(Number(result.row.bill_id));
      created += 1;
    } catch (error) {
      if (String(error.message).toLowerCase().includes("insufficient stock")) {
        skipped += 1;
        continue;
      }
      skipped += 1;
    }
  }

  if (!createdBillIds.length) {
    console.log("No bills created.");
    return;
  }

  if (skipDbTimeRandomize) {
    console.log("Skip DB datetime randomization (--skip-db-time=true).");
  } else {
    const db = await mysql.createConnection({
      host: process.env.DB_HOST || "127.0.0.1",
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "warehouse_app"
    });

    try {
      for (const billId of createdBillIds) {
        const dt = randomDatetimeBetween(fromDate, toDate);
        const mysqlDt = formatMysqlDatetime(dt);
        await db.execute(
          `UPDATE bills
           SET bill_datetime = ?, created_at = ?, updated_at = ?
           WHERE bill_id = ?`,
          [mysqlDt, mysqlDt, mysqlDt, billId]
        );
        await db.execute(
          `UPDATE stock_movements
           SET movement_datetime = ?
           WHERE bill_id = ?`,
          [mysqlDt, billId]
        );
      }
    } finally {
      await db.end();
    }
  }

  console.log(`Done. created=${created}, skipped=${skipped}, items_per_bill=${itemsPerBill}, bills_tagged=${createdBillIds.length}`);
  if (!skipDbTimeRandomize) {
    console.log(`Date range randomized between ${fromDate.toISOString().slice(0, 10)} and ${toDate.toISOString().slice(0, 10)}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
