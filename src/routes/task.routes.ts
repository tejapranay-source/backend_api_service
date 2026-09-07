import { Router, RequestHandler } from "express";
import { createTask, getTasks } from "../controllers/task.controller";
import { authenticate } from "../middleware/auth.middleware";
import { encryptionMiddleware } from "../middleware/encryption.middleware";

const router: Router = Router();

// Task routes require authentication and explicit E2EE encryption envelope
router.post("/", authenticate, encryptionMiddleware, createTask as RequestHandler<any>);
router.get("/", authenticate, encryptionMiddleware, getTasks as RequestHandler<any>);

export default router;