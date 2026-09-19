import { Router, type IRouter } from "express";
import healthRouter from "./health";
import decisionsRouter from "./decisions";
import storageRouter from "./storage";

const router: IRouter = Router();

router.use(healthRouter);
router.use(decisionsRouter);
router.use(storageRouter);

export default router;
