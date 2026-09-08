import { Request, Response, NextFunction } from "express";

import {

  createTaskService,

  getTasksService,

  getTaskByIdService,

  updateTaskService,

  deleteTaskService,

  ICreateTaskDTO,

  IUpdateTaskDTO,

  ITaskQueryParams,

} from "../services/task.service";



// Explicit Route Parameter Interfaces

interface ITaskParam {

  id: string;

}



// Helper function to safely parse integer IDs

const parseNumericId = (idStr: string): number | null => {

  const parsed = Number(idStr);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;

};



// 1. Create Task

export const createTask = async (

  req: Request<{}, {}, ICreateTaskDTO>,

  res: Response,

  next: NextFunction

): Promise<void> => {

  try {

    const userId = req.user?.id;



    if (!userId) {

      res.status(401).json({ code: "UNAUTHORIZED", message: "Authentication required." });

      return;

    }



    const idempotencyKey = req.header("Idempotency-Key");



    const task = await createTaskService(userId, req.body, idempotencyKey);

    res.status(201).json({

      status: "SUCCESS",

      data: task,

    });

  } catch (error) {

    next(error);

  }

};



// 2. Get Paginated & Filtered Tasks

export const getTasks = async (

  req: Request<{}, {}, {}, ITaskQueryParams>,

  res: Response,

  next: NextFunction

): Promise<void> => {

  try {

    const userId = req.user?.id;



    if (!userId) {

      res.status(401).json({ code: "UNAUTHORIZED", message: "Authentication required." });

      return;

    }



    // Sanitize and guard pagination query inputs

    const rawPage = Number(req.query.page);

    const rawLimit = Number(req.query.limit);



    const page = !isNaN(rawPage) && rawPage > 0 ? rawPage : 1;

    const limit = !isNaN(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 10;



    const result = await getTasksService(userId, {

      ...req.query,

      page,

      limit,

    });



    res.status(200).json({

      status: "SUCCESS",

      ...result,

    });

  } catch (error) {

    next(error);

  }

};



// 3. Get Task By ID

export const getTaskById = async (

  req: Request<ITaskParam>,

  res: Response,

  next: NextFunction

): Promise<void> => {

  try {

    const userId = req.user?.id;

    if (!userId) {

      res.status(401).json({ code: "UNAUTHORIZED", message: "Authentication required." });

      return;

    }



    const taskId = parseNumericId(req.params.id);

    if (!taskId) {

      res.status(400).json({ code: "INVALID_PARAM", message: "Task ID must be a positive integer." });

      return;

    }



    const task = await getTaskByIdService(userId, taskId);

    if (!task) {

      res.status(404).json({ code: "NOT_FOUND", message: "Task not found." });

      return;

    }



    res.status(200).json({

      status: "SUCCESS",

      data: task,

    });

  } catch (error) {

    next(error);

  }

};



// 4. Update Task

export const updateTask = async (

  req: Request<ITaskParam, {}, IUpdateTaskDTO>,

  res: Response,

  next: NextFunction

): Promise<void> => {

  try {

    const userId = req.user?.id;

    if (!userId) {

      res.status(401).json({ code: "UNAUTHORIZED", message: "Authentication required." });

      return;

    }



    const taskId = parseNumericId(req.params.id);

    if (!taskId) {

      res.status(400).json({ code: "INVALID_PARAM", message: "Task ID must be a positive integer." });

      return;

    }



    const updatedTask = await updateTaskService(userId, taskId, req.body);

    if (!updatedTask) {

      res.status(404).json({ code: "NOT_FOUND", message: "Task not found or unauthorized to modify." });

      return;

    }



    res.status(200).json({

      status: "SUCCESS",

      data: updatedTask,

    });

  } catch (error) {

    next(error);

  }

};



// 5. Delete Task

export const deleteTask = async (

  req: Request<ITaskParam>,

  res: Response,

  next: NextFunction

): Promise<void> => {

  try {

    const userId = req.user?.id;

    if (!userId) {

      res.status(401).json({ code: "UNAUTHORIZED", message: "Authentication required." });

      return;

    }



    const taskId = parseNumericId(req.params.id);

    if (!taskId) {

      res.status(400).json({ code: "INVALID_PARAM", message: "Task ID must be a positive integer." });

      return;

    }



    const success = await deleteTaskService(userId, taskId);

    if (!success) {

      res.status(404).json({ code: "NOT_FOUND", message: "Task not found or unauthorized to delete." });

      return;

    }



    res.status(200).json({

      status: "SUCCESS",

      message: "Task deleted successfully.",

    });

  } catch (error) {

    next(error);

  }

};