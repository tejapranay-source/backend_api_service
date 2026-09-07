import { Request, Response } from "express";
// Import your task services here when ready
// import { createTaskService, getTasksService, ... } from "../services/task.service";

export const createTask = async (req: Request, res: Response): Promise<Response> => {
  try {
    // Access authenticated user via req.user (attached by your auth middleware)
    const userId = (req as any).user?.id; 
    
    // TODO: Call createTaskService(userId, req.body)
    return res.status(201).json({ message: "Task created successfully", data: req.body });
  } catch (error) {
    console.error("Error creating task:", error);
    return res.status(500).json({ message: "Failed to create task" });
  }
};

export const getTasks = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = (req as any).user?.id;
    
    // TODO: Call getTasksService(userId)
    return res.status(200).json({ message: "Fetched tasks successfully", tasks: [] });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return res.status(500).json({ message: "Failed to fetch tasks" });
  }
};