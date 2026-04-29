import { Router } from "express";
import healthRouter from "./health.js";     // .js 확장자 추가
import storesRouter from "./stores.js";
import suggestionsRouter from "./suggestions.js";

const router = Router();

router.use(healthRouter);
router.use(storesRouter);
router.use(suggestionsRouter);

export default router;