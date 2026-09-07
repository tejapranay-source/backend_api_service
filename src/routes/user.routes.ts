import { Router, RequestHandler } from "express";
import {
  createUser,
  loginUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  getUserActivity,
  getUserActivityById,
} from "../controllers/user.controller";
import { authenticate } from "../middleware/auth.middleware";
import { encryptionMiddleware } from "../middleware/encryption.middleware";

const router: Router = Router();

// Public routes   === (Encrypted wrapper applied via encryptionMiddleware)
router.post("/register", encryptionMiddleware, createUser);
router.post("/login", encryptionMiddleware, loginUser);

// Authenticated routes (Encrypted wrapper applied along with authentication)
// 1. Static GET routes (must come BEFORE /:id)
router.get("/", authenticate, encryptionMiddleware, getUsers);
router.get("/activity", authenticate, encryptionMiddleware, getUserActivity);

// 2. Specific item GET routes
router.get("/:id/activity", authenticate, encryptionMiddleware, getUserActivityById as RequestHandler<any>);
router.get("/:id", authenticate, encryptionMiddleware, getUserById as RequestHandler<any>);

// 3. Mutation routes
router.put("/:id", authenticate, encryptionMiddleware, updateUser as RequestHandler<any>);
router.delete("/:id", authenticate, encryptionMiddleware, deleteUser as RequestHandler<any>);

export default router;