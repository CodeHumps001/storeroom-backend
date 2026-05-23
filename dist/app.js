"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const cors_1 = __importDefault(require("cors"));
const healthRoutes_1 = __importDefault(require("./routes/healthRoutes"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const categoryRoutes_1 = __importDefault(require("./routes/categoryRoutes"));
const productRoutes_1 = __importDefault(require("./routes/productRoutes"));
const salesRoutes_1 = __importDefault(require("./routes/salesRoutes"));
const staffRoutes_1 = __importDefault(require("./routes/staffRoutes"));
const reportRoutes_1 = __importDefault(require("./routes/reportRoutes"));
const paymentRoutes_1 = __importDefault(require("./routes/paymentRoutes"));
const app = (0, express_1.default)();
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: "*",
    credentials: false,
}));
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10000, // max 100 requests per IP per window
    message: {
        status: "failed",
        message: "Too many requests, please try again later",
    },
});
app.use("/api", limiter);
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
