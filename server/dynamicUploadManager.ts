import multer from "multer";
import path from "path";
import { memoryManager } from "./memoryManager";

interface UploadConfig {
  fileSize: number;
  maxFiles: number;
}

export class DynamicUploadManager {
  private normalConfig: UploadConfig;
  private optimizedConfig: UploadConfig;
  private currentConfig: UploadConfig;
  private uploadDir: string;

  constructor(uploadDir: string) {
    this.uploadDir = uploadDir;
    this.normalConfig = {
      fileSize: 5 * 1024 * 1024, // 5MB
      maxFiles: 5,
    };
    this.optimizedConfig = {
      fileSize: 2 * 1024 * 1024, // 2MB
      maxFiles: 3,
    };
    this.currentConfig = { ...this.normalConfig };
  }

  createUploadMiddleware() {
    return multer({
      storage: multer.diskStorage({
        destination: this.uploadDir,
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
          cb(null, uniqueSuffix + path.extname(file.originalname));
        },
      }),
      limits: {
        fileSize: this.currentConfig.fileSize,
        files: this.currentConfig.maxFiles,
      },
      fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (extname && mimetype) {
          cb(null, true);
        } else {
          cb(new Error("Only image files are allowed"));
        }
      },
    });
  }

  updateConfig(): void {
    const isOptimized = memoryManager.isCurrentlyOptimized();
    const newConfig = isOptimized ? this.optimizedConfig : this.normalConfig;
    
    if (
      this.currentConfig.fileSize !== newConfig.fileSize ||
      this.currentConfig.maxFiles !== newConfig.maxFiles
    ) {
      this.currentConfig = { ...newConfig };
      console.log(`📁 Upload limits updated: ${this.currentConfig.fileSize / (1024 * 1024)}MB, ${this.currentConfig.maxFiles} files`);
    }
  }

  getCurrentConfig(): UploadConfig {
    return { ...this.currentConfig };
  }

  getMemoryAwareLimits(): { fileSize: string; maxFiles: number } {
    return {
      fileSize: `${this.currentConfig.fileSize / (1024 * 1024)}MB`,
      maxFiles: this.currentConfig.maxFiles,
    };
  }
}

// Global upload manager instance
export const dynamicUploadManager = new DynamicUploadManager(
  path.join(process.cwd(), "uploads")
);