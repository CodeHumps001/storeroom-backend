"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const healthRoutes_1 = __importDefault(require("./routes/healthRoutes"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const categoryRoutes_1 = __importDefault(require("./routes/categoryRoutes"));
const productRoutes_1 = __importDefault(require("./routes/productRoutes"));
const salesRoutes_1 = __importDefault(require("./routes/salesRoutes"));
const staffRoutes_1 = __importDefault(require("./routes/staffRoutes"));
const reportRoutes_1 = __importDefault(require("./routes/reportRoutes"));
const paymentRoutes_1 = __importDefault(require("./routes/paymentRoutes"));
const app = (0, express_1.default)();
app.use("/api/v1/payments/webhook", express_1.default.raw({ type: "application/json" }));
app.use(express_1.default.json());
//Routes
app.use("/api/v1/health", healthRoutes_1.default);
app.use("/api/v1/auth", authRoutes_1.default);
app.use("/api/v1/categories", categoryRoutes_1.default);
app.use("/api/v1/products", productRoutes_1.default);
app.use("/api/v1/sales", salesRoutes_1.default);
app.use("/api/v1/staff", staffRoutes_1.default);
app.use("/api/v1/reports", reportRoutes_1.default);
app.use("/api/v1/payments", paymentRoutes_1.default);
exports.default = app;
