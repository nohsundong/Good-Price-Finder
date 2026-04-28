import { Router, type IRouter } from "express";
import healthRouter from "./health";
import storesRouter from "./stores";
import suggestionsRouter from "./suggestions";

const router: IRouter = Router();

router.use(healthRouter);
router.use(storesRouter);
router.use(suggestionsRouter);

export default router;
