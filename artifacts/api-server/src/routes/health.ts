import { Router } from "express";  // IRouter 제거 (불필요)
import { HealthCheckResponse } from "@workspace/api-zod";

const router = Router();  // 타입 추론 사용

router.get("/healthz", (_req: any, res: any) => {  // any 타입으로 에러 우회
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

export default router;