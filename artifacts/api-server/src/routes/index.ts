import { Router, type IRouter } from "express";
import healthRouter from "./health";
import aiRouter from "./ai";
import authRouter from "./auth";
import itemsRouter from "./items";
import categoriesRouter from "./categories";
import filesRouter from "./files";
import usersRouter from "./users";
import conversationsRouter from "./conversations";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/ai", aiRouter);
router.use("/items", itemsRouter);
router.use("/categories", categoriesRouter);
router.use("/files", filesRouter);
router.use("/users", usersRouter);
router.use("/conversations", conversationsRouter);

export default router;
