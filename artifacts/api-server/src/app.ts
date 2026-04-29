import express, { type Express } from "express";
import cors from "cors";

const app: Express = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 순수 헬스체크 (workspace/DB 없음)
app.get("/api/healthz", (req, res) => {
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    message: "Server working!" 
  });
});

export default app;