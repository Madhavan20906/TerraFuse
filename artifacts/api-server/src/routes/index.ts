import { Router, type IRouter } from "express";
import healthRouter from "./health";
import decisionsRouter from "./decisions";
import storageRouter from "./storage";
import integrationsRouter from "./integrations";

const router: IRouter = Router();

router.use(healthRouter);
router.use(decisionsRouter);
router.use(storageRouter);
router.use(integrationsRouter);

export default router;
