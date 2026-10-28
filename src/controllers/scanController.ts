import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import * as scanHub from "../lib/scanHub";

const CHANNEL_RE = /^[A-Za-z0-9_-]{6,64}$/;

// GET /scan/stream?channel=abc123  (POS screen listens here)
const stream = (req: AuthenticatedRequest, res: Response) => {
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
const push = (req: AuthenticatedRequest, res: Response) => {
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

export default { stream, push };