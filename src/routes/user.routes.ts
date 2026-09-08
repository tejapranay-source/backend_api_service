import { Router } from "express";
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

// --- Public Authentication Routes ---
// Placed before global router middleware so standard JSON payload testing works seamlessly
router.post("/register", createUser);
router.post("/login", loginUser);

// --- Global Encryption Pipeline Protection ---
// Enforces encryption envelope on all remaining user management endpoints
router.use(encryptionMiddleware);

// --- Protected User Management Routes ---
// Apply auth middleware pipeline to all subsequent routes
router.use(authenticate);

// 1. Static GET routes (Must precede /:id routes)
router.get("/", getUsers);
router.get("/activity", getUserActivity);

// 2. Resource-specific GET routes
router.get("/:id/activity", getUserActivityById);
router.get("/:id", getUserById);

// 3. Resource Mutation routes
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);

export default router;