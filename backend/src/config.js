import dotenv from "dotenv";

dotenv.config();

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toArray(value) {
  if (!value) {
    return [];
  }
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export const config = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: toNumber(process.env.PORT, 5000),
  db: {
    host: process.env.DB_HOST || "127.0.0.1",
    port: toNumber(process.env.DB_PORT, 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "warehouse_app",
    waitForConnections: true,
    connectionLimit: toNumber(process.env.DB_CONN_LIMIT, 12),
    queueLimit: 0,
    decimalNumbers: true
  },
  jwtSecret: process.env.JWT_SECRET || "replace_me_in_env",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "12h",
  corsOrigin: toArray(process.env.CORS_ORIGIN),
  admin: {
    username: process.env.ADMIN_USERNAME || "admin01",
    password: process.env.ADMIN_PASSWORD || "admin123",
    displayName: process.env.ADMIN_DISPLAY_NAME || "Main Admin"
  }
};
