import express, { type Express } from "express";
import cors from "cors";
import router from "./routes/index.js";  // 명시적 .js 경로
import { logger } from "./lib/logger";

const app: Express = express();

// 임시 콘솔 로깅 (pino-http 제거)
app.use((req: any, res: any, next: any) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;