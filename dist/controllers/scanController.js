"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const scanHub = __importStar(require("../lib/scanHub"));
const CHANNEL_RE = /^[A-Za-z0-9_-]{6,64}$/;
// GET /scan/stream?channel=abc123  (POS screen listens here)
const stream = (req, res) => {
    if (!req.user) {
        return res.status(401).json({ status: "failed", message: "Unauthorized" });
    }
    const channel = String(req.query.channel ?? "");
    if (!CHANNEL_RE.test(channel)) {
        return res
            .status(400)
            .json({ status: "failed", message: "Invalid pairing channel" });
    }
    res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no", // stop nginx-style proxies from buffering the stream
    });
    res.write(`data: ${JSON.stringify({ type: "ready" })}\n\n`);
    const unsubscribe = scanHub.subscribe(req.user.organizationId, channel, res);
    // Heartbeat keeps proxies/load balancers from closing an "idle" connection
    const heartbeat = setInterval(() => res.write(": ping\n\n"), 20000);
    req.on("close", () => {
        clearInterval(heartbeat);
        unsubscribe();
    });
};
// POST /scan/push  { channel, value }  (phone sends scans here)
const push = (req, res) => {
    if (!req.user) {
        return res.status(401).json({ status: "failed", message: "Unauthorized" });
    }
    const { channel, value } = req.body ?? {};
    if (typeof channel !== "string" || !CHANNEL_RE.test(channel)) {
        return res
            .status(400)
            .json({ status: "failed", message: "Invalid pairing channel" });
    }
    if (typeof value !== "string" || !value.trim() || value.length > 200) {
        return res
            .status(400)
            .json({ status: "failed", message: "Invalid scan value" });
    }
    const delivered = scanHub.publish(req.user.organizationId, channel, {
        type: "scan",
        value: value.trim(),
        at: Date.now(),
    });
    // delivered = 0 means no POS screen is currently listening on this channel
    res.status(200).json({ status: "success", data: { delivered } });
};
exports.default = { stream, push };
