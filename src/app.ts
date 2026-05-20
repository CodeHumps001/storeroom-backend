import dotenv from "dotenv";
dotenv.config();
import express from "express";
import healthRouter from "./routes/healthRoutes";
import authRouter from "./routes/authRoutes";
import categoryRouter from "./routes/categoryRoutes";
import productRouter from "./routes/productRoutes";
import salesRouter from "./routes/salesRoutes";

const app = express();

app.use(express.json());

//Routes
app.use("/api/v1/health", healthRouter);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/categories", categoryRouter);
app.use("/api/v1/products", productRouter);
app.use("/api/v1/sales", salesRouter);

export default app;
