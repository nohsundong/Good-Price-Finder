import { Router } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";

const router = Router();

router.get("/healthz", (req: any, res: any) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.status(200).json(data);
});

export default router;