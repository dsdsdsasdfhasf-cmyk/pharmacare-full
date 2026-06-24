import { Router, type IRouter } from "express";
import healthRouter from "./health";
import categoriesRouter from "./categories";
import suppliersRouter from "./suppliers";
import medicinesRouter from "./medicines";
import customersRouter from "./customers";
import prescriptionsRouter from "./prescriptions";
import salesRouter from "./sales";
import purchasesRouter from "./purchases";
import dashboardRouter from "./dashboard";
import reportsRouter from "./reports";
import authRouter from "./auth";
import usersRouter from "./users";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(categoriesRouter);
router.use(suppliersRouter);
router.use(medicinesRouter);
router.use(customersRouter);
router.use(prescriptionsRouter);
router.use(salesRouter);
router.use(purchasesRouter);
router.use(dashboardRouter);
router.use(reportsRouter);

export default router;
