import express from "express";
import userRoutes from "./routes/user.routes";
import taskRoutes from "./routes/task.routes";

const app = express();

app.use(express.json());

// Mount routes with the /api prefix to match Postman
app.use("/api/users", userRoutes);
app.use("/api/tasks", taskRoutes);

export default app;