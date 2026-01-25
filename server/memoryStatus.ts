import { Router } from "express";
import { memoryManager } from "./memoryManager";
import { dynamicUploadManager } from "./dynamicUploadManager";

const router = Router();

// Memory status endpoint for monitoring
router.get("/api/memory/status", (req, res) => {
  const memUsage = process.memoryUsage();
  const memoryStatus = memoryManager.getMemoryStatus();
  const uploadLimits = dynamicUploadManager.getMemoryAwareLimits();
  
  res.json({
    memory: {
      rss: Math.round(memUsage.rss / (1024 * 1024)),
      heapTotal: Math.round(memUsage.heapTotal / (1024 * 1024)),
      heapUsed: Math.round(memUsage.heapUsed / (1024 * 1024)),
      external: Math.round(memUsage.external / (1024 * 1024)),
    },
    optimization: {
      isOptimized: memoryStatus.isOptimized,
      thresholds: memoryStatus.thresholds,
      lastCheck: new Date(memoryStatus.lastCheck).toISOString(),
      currentMemory: Math.round(memoryStatus.currentMemory),
    },
    uploadLimits,
    system: {
      nodeVersion: process.version,
      platform: process.platform,
      uptime: process.uptime(),
    },
  });
});

// Memory optimization control endpoint (for debugging)
router.post("/api/memory/force-optimize", (req, res) => {
  // Only allow in development
  if (process.env.NODE_ENV === "production") {
    return res.status(403).json({ message: "Not allowed in production" });
  }
  
  memoryManager.applyOptimizations(require("./db").pool);
  res.json({ message: "Forced optimization applied" });
});

router.post("/api/memory/force-revert", (req, res) => {
  // Only allow in development
  if (process.env.NODE_ENV === "production") {
    return res.status(403).json({ message: "Not allowed in production" });
  }
  
  memoryManager.revertOptimizations(require("./db").pool);
  res.json({ message: "Forced reversion applied" });
});

export default router;