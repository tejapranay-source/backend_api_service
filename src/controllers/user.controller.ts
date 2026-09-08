import { Request, Response, NextFunction } from "express";
import {
  createUserService,
  loginUserService,
  getUsersService,
  getUserByIdService,
  updateUserService,
  deleteUserService,
  getUserActivityService,
  getUserActivityByIdService,
  ICreateUserDTO,
  IUpdateUserDTO,
  ILoginDTO,
  IUserQueryParams,
} from "../services/user.service";

interface IUserParams {
  id: string;
}

// Strict numeric parameter sanitizer
const parsePositiveIntegerId = (idStr: string): number | null => {
  const parsed = Number(idStr);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

// 1. Create User
export const createUser = async (
  req: Request<{}, {}, ICreateUserDTO>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password, name } = req.body || {};

    // Explicit payload validation guard
    if (!email || !password || !name) {
      res.status(400).json({
        code: "INVALID_REGISTRATION_PAYLOAD",
        message: "Name, email, and password are required fields.",
      });
      return;
    }

    const idempotencyKey = req.header("Idempotency-Key");
    const user = await createUserService(req.body, idempotencyKey);

    res.status(201).json({
      status: "SUCCESS",
      data: user,
    });
  } catch (error) {
    console.error("[CONTROLLER_CREATE_USER_ERROR]", error);
    next(error);
  }
};

// 2. User Login
export const loginUser = async (
  req: Request<{}, {}, ILoginDTO>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      res.status(400).json({
        code: "INVALID_CREDENTIALS_PAYLOAD",
        message: "Email and password are required.",
      });
      return;
    }

    const authResult = await loginUserService(email, password);

    if (!authResult) {
      // Secure response: do not disclose whether email or password was invalid
      res.status(401).json({
        code: "UNAUTHORIZED",
        message: "Invalid credentials provided.",
      });
      return;
    }

    res.status(200).json({
      status: "SUCCESS",
      data: authResult,
    });
  } catch (error) {
    console.error("[CONTROLLER_LOGIN_USER_ERROR]", error);
    next(error);
  }
};

// 3. Get Paginated & Filtered Users
export const getUsers = async (
  req: Request<{}, {}, {}, IUserQueryParams>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const search = req.query.q || req.query.search;
    const sortBy = req.query.sortBy || "id";
    const order = req.query.order || "asc";
    const nulls = req.query.nulls || "last";

    const rawPage = Number(req.query.page);
    const rawLimit = Number(req.query.limit);

    const page = !isNaN(rawPage) && rawPage > 0 ? rawPage : 1;
    const limit = !isNaN(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 10;

    const data = await getUsersService(search, sortBy, order, nulls, page, limit);

    res.status(200).json({
      status: "SUCCESS",
      ...data,
    });
  } catch (error) {
    next(error);
  }
};

// 4. Get User By ID
export const getUserById = async (
  req: Request<IUserParams>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = parsePositiveIntegerId(req.params.id);

    if (!id) {
      res.status(400).json({
        code: "INVALID_PARAM",
        message: "User ID must be a positive integer.",
      });
      return;
    }

    const user = await getUserByIdService(id);

    if (!user) {
      res.status(404).json({
        code: "NOT_FOUND",
        message: "User not found.",
      });
      return;
    }

    res.status(200).json({
      status: "SUCCESS",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// 5. Update User
export const updateUser = async (
  req: Request<IUserParams, {}, IUpdateUserDTO>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = parsePositiveIntegerId(req.params.id);

    if (!id) {
      res.status(400).json({
        code: "INVALID_PARAM",
        message: "User ID must be a positive integer.",
      });
      return;
    }

    const updatedUser = await updateUserService(id, req.body);

    if (!updatedUser) {
      res.status(404).json({
        code: "NOT_FOUND",
        message: "User not found or unavailable for update.",
      });
      return;
    }

    res.status(200).json({
      status: "SUCCESS",
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

// 6. Delete User
export const deleteUser = async (
  req: Request<IUserParams>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = parsePositiveIntegerId(req.params.id);

    if (!id) {
      res.status(400).json({
        code: "INVALID_PARAM",
        message: "User ID must be a positive integer.",
      });
      return;
    }

    const deletedUser = await deleteUserService(id);

    if (!deletedUser) {
      res.status(404).json({
        code: "NOT_FOUND",
        message: "User not found.",
      });
      return;
    }

    res.status(200).json({
      status: "SUCCESS",
      message: "User deleted successfully.",
      data: deletedUser,
    });
  } catch (error) {
    next(error);
  }
};

// 7. Get User Activity
export const getUserActivity = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const activity = await getUserActivityService();
    res.status(200).json({
      status: "SUCCESS",
      data: activity,
    });
  } catch (error) {
    next(error);
  }
};

// 8. Get User Activity By ID
export const getUserActivityById = async (
  req: Request<IUserParams>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = parsePositiveIntegerId(req.params.id);

    if (!id) {
      res.status(400).json({
        code: "INVALID_PARAM",
        message: "User ID must be a positive integer.",
      });
      return;
    }

    const activity = await getUserActivityByIdService(id);

    res.status(200).json({
      status: "SUCCESS",
      data: activity,
    });
  } catch (error) {
    next(error);
  }
};