import dotenv from "dotenv";
dotenv.config();
import express from "express";
import healthRouter from "./routes/healthRoutes";
import authRouter from "./routes/authRoutes";

const app = express();

app.use(express.json());

//Routes
app.use("/api/v1/health", healthRouter);
app.use("/api/v1/auth", authRouter);

export default app;
