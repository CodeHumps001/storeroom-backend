import dotenv from "dotenv";
dotenv.config();
import express from "express";
import healthRouter from "./routes/healthRoutes";

const app = express();

app.use(express.json());

//Routes
app.use("/api/v1/health", healthRouter);

export default app;
