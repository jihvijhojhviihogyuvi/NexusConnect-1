// Launcher to start both the main app and the dev console in one process
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

// Import both entry points. They use top-level await and will start their servers.
await import("./start.ts");
await import("./devServer.ts");

// Keep the process alive; servers started by the imports will keep the event loop running.
export {};
