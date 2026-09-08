import { Router } from "express";
import {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
} from "../controllers/task.controller";
import { authenticate } from "../middleware/auth.middleware";
import { encryptionMiddleware } from "../middleware/encryption.middleware";

const router: Router = Router();

// Global Pipeline Protection: Enforce auth and encryption across all task routes
router.use(authenticate);
router.use(encryptionMiddleware);

// --- Task Routes ---

// Create new task
router.post("/", createTask);

// List tasks (Paginated & Filtered)
router.get("/", getTasks);

// Get single task by ID
router.get("/:id", getTaskById);

// Update task by ID
router.put("/:id", updateTask);

// Delete task by ID
router.delete("/:id", deleteTask);

export default router;