import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { config } from "./config.js";
import { pool } from "./db.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import teamRoutes from "./routes/teamRoutes.js";
import warehouseRoutes from "./routes/warehouseRoutes.js";
import billRoutes from "./routes/billRoutes.js";
import reconcileRoutes from "./routes/reconcileRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import auditRoutes from "./routes/auditRoutes.js";
import { authenticate } from "./middleware/auth.js";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDir = path.resolve(__dirname, "../../frontend");

app.set("trust proxy", 1);

const corsOptions = config.corsOrigin.length
  ? {
      origin(origin, callback) {
        if (!origin || config.corsOrigin.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error("Not allowed by CORS"));
      }
    }
  : {};

app.use(cors(corsOptions));
app.use(helmet());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: false }));
app.use(
  morgan(config.nodeEnv === "production" ? "combined" : "dev")
);
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 600
  })
);

app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api", authenticate);
app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/warehouses", warehouseRoutes);
app.use("/api/bills", billRoutes);
app.use("/api/reconcile", reconcileRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/audits", auditRoutes);

app.use(express.static(frontendDir));
app.get("*", (_req, res) => {
  res.sendFile(path.join(frontendDir, "index.html"));
});

app.use((error, _req, res, _next) => {
  if (error?.name === "MulterError") {
    if (error.code === "LIMIT_FILE_SIZE") {
      res.status(413).json({ message: "File too large (max 80MB)" });
      return;
    }
    res.status(400).json({ message: error.message || "Upload error" });
    return;
  }

  if (error?.status) {
    res.status(error.status).json({
      message: error.message,
      extra: error.extra || null
    });
    return;
  }

  if (error?.message?.includes("CORS")) {
    res.status(403).json({ message: error.message });
    return;
  }

  if (config.nodeEnv !== "production") {
    // eslint-disable-next-line no-console
    console.error(error);
  }
  res.status(500).json({ message: "Internal server error" });
});

app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`API listening on http://localhost:${config.port}`);
});
