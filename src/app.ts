import dotenv from "dotenv";
dotenv.config();
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cors from "cors";
import healthRouter from "./routes/healthRoutes";
import authRouter from "./routes/authRoutes";
import categoryRouter from "./routes/categoryRoutes";
import productRouter from "./routes/productRoutes";
import salesRouter from "./routes/salesRoutes";
import staffRouter from "./routes/staffRoutes";
import reportRouter from "./routes/reportRoutes";
import paymentRoutes from "./routes/paymentRoutes";

const app = express();
app.use(helmet());

app.use(
  cors({
    origin: "*",
    credentials: false,
  }),
);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000, // max 100 requests per IP per window
  message: {
    status: "failed",
    message: "Too many requests, please try again later",
  },
});

app.use("/api", limiter);

app.use("/api/v1/payments/webhook", express.raw({ type: "application/json" }));
app.use(express.json());

//Routes
app.use("/api/v1/health", healthRouter);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/categories", categoryRouter);
app.use("/api/v1/products", productRouter);
app.use("/api/v1/sales", salesRouter);
app.use("/api/v1/staff", staffRouter);
app.use("/api/v1/reports", reportRouter);
app.use("/api/v1/payments", paymentRoutes);

export default app;
