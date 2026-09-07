import { Request, Response } from "express";
import {
  createUserService,
  loginUserService,
  getUsersService,
  getUserByIdService,
  updateUserService,
  deleteUserService,
  getUserActivityService,
  getUserActivityByIdService,
} from "../services/user.service";
import { ICreateUserDTO, IUpdateUserDTO } from "../services/user.service";

interface IUserQueryParams {
  q?: string;
  search?: string;
  sortBy?: string;
  order?: string;
  nulls?: string;
  page?: string;
  limit?: string;
}

interface IUserParams {
  id: string;
}

interface ILoginDTO {
  email?: string;
  password?: string;
}

export const createUser = async (
  req: Request<{}, {}, ICreateUserDTO>,
  res: Response
): Promise<Response> => {
  try {
    const user = await createUserService(req.body);
    return res.status(201).json(user);
  } catch (error: any) {
    console.error("Error creating user:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: "Validation failed",
        errors: error.data,
      });
    }

    return res.status(500).json({
      message: "Failed to create user",
    });
  }
};

export const loginUser = async (
  req: Request<{}, {}, ILoginDTO>,
  res: Response
): Promise<Response> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const result = await loginUserService(email, password);

    if (!result) {
      console.log(`Unauthorized login attempt: ${email}`);
      return res.status(401).json({
        message: "Unauthorized. Invalid email or password.",
      });
    }

    console.log(`Login successful: ${email}`);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error logging in user:", error);
    return res.status(500).json({
      message: "Failed to login",
    });
  }
};

export const getUsers = async (
  req: Request<{}, {}, {}, IUserQueryParams>,
  res: Response
): Promise<Response> => {
  try {
    const search = req.query.q || req.query.search;
    const sortBy = req.query.sortBy || "id";
    const order = req.query.order || "asc";
    const nulls = req.query.nulls || "last";
    
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 10;

    const data = await getUsersService(search, sortBy, order, nulls, page, limit);

    return res.status(200).json(data);
  } catch (error) {
    console.error("Error getting users:", error);
    return res.status(500).json({
      message: "Failed to get users",
    });
  }
};

export const getUserById = async (
  req: Request<IUserParams>,
  res: Response
): Promise<Response> => {
  try {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        message: "Invalid user ID",
      });
    }

    const user = await getUserByIdService(id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.status(200).json(user);
  } catch (error) {
    console.error("Error getting user by ID:", error);
    return res.status(500).json({
      message: "Failed to get user",
    });
  }
};

export const updateUser = async (
  req: Request<IUserParams, {}, IUpdateUserDTO>,
  res: Response
): Promise<Response> => {
  try {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        message: "Invalid user ID",
      });
    }

    const user = await updateUserService(id, req.body);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.status(200).json(user);
  } catch (error) {
    console.error("Error updating user:", error);
    return res.status(500).json({
      message: "Failed to update user",
    });
  }
};

export const deleteUser = async (
  req: Request<IUserParams>,
  res: Response
): Promise<Response> => {
  try {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        message: "Invalid user ID",
      });
    }

    const user = await deleteUserService(id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.status(200).json({
      message: "User deleted successfully",
      user,
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    return res.status(500).json({
      message: "Failed to delete user",
    });
  }
};

export const getUserActivity = async (
  _req: Request,
  res: Response
): Promise<Response> => {
  try {
    const activity = await getUserActivityService();
    return res.status(200).json(activity);
  } catch (error) {
    console.error("Error getting user activity:", error);
    return res.status(500).json({
      message: "Failed to get user activity",
    });
  }
};

export const getUserActivityById = async (
  req: Request<IUserParams>,
  res: Response
): Promise<Response> => {
  try {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        message: "Invalid user ID",
      });
    }

    const activity = await getUserActivityByIdService(id);
    return res.status(200).json(activity);
  } catch (error) {
    console.error("Error getting user activity by ID:", error);
    return res.status(500).json({
      message: "Failed to get user activity by ID",
    });
  }
};
