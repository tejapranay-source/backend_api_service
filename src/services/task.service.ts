import { Model } from "objection";

// Interfaces imported by task.controller.ts
export interface ICreateTaskDTO {
  title: string;
  description?: string;
  status?: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  due_date?: string;
}

export interface IUpdateTaskDTO {
  title?: string;
  description?: string;
  status?: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  due_date?: string;
}

export interface ITaskQueryParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}

export interface ITask {
  id: number;
  user_id: number;
  title: string;
  description?: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  due_date?: string;
  created_at: string;
  updated_at: string;
}

// Task Database Model
export class Task extends Model implements ITask {
  id!: number;
  user_id!: number;
  title!: string;
  description?: string;
  status!: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  due_date?: string;
  created_at!: string;
  updated_at!: string;

  static get tableName() {
    return "tasks";
  }

  $beforeInsert() {
    this.created_at = new Date().toISOString();
    this.updated_at = new Date().toISOString();
    if (!this.status) {
      this.status = "PENDING";
    }
  }

  $beforeUpdate() {
    this.updated_at = new Date().toISOString();
  }
}

// Services required by task.controller.ts
export const createTaskService = async (
  userId: number,
  payload: ICreateTaskDTO,
  _idempotencyKey?: string
): Promise<Task> => {
  return await Task.query().insert({
    ...payload,
    user_id: userId,
  });
};

export const getTasksService = async (
  userId: number,
  params: ITaskQueryParams
) => {
  const page = params.page || 1;
  const limit = params.limit || 10;

  let query = Task.query().where({ user_id: userId });

  if (params.status) {
    query = query.where({ status: params.status });
  }

  if (params.search) {
    query = query.where("title", "ilike", `%${params.search}%`);
  }

  const result = await query.page(page - 1, limit);

  return {
    data: result.results,
    pagination: {
      total: result.total,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit),
    },
  };
};

export const getTaskByIdService = async (
  userId: number,
  taskId: number
): Promise<Task | null> => {
  const task = await Task.query().findOne({ id: taskId, user_id: userId });
  return task || null;
};

export const updateTaskService = async (
  userId: number,
  taskId: number,
  payload: IUpdateTaskDTO
): Promise<Task | null> => {
  const task = await Task.query().findOne({ id: taskId, user_id: userId });
  if (!task) return null;

  const updatedTask = await Task.query().patchAndFetchById(taskId, payload);
  return updatedTask;
};

export const deleteTaskService = async (
  userId: number,
  taskId: number
): Promise<boolean> => {
  const deletedCount = await Task.query()
    .delete()
    .where({ id: taskId, user_id: userId });

  return deletedCount > 0;
};