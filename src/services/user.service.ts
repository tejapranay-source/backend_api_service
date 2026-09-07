import jwt from "jsonwebtoken";
import { OrderByDirection, OrderByNulls } from "objection";
import { User, IActivityLog } from "../models/user.model";

export interface ICreateUserDTO {
  name: string;
  email: string;
  password: string;
  activity_log?: IActivityLog[];
  [key: string]: any;
}

export interface IUpdateUserDTO {
  name: string;
  email: string;
}

export interface ILoginResponse {
  message: string;
  token: string;
  user: {
    id: number;
    name: string;
    email: string;
  };
}

export interface IPaginatedUsers {
  results: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface IUserActivityResponse {
  userId: number;
  activity: IActivityLog[];
}

const logUserActivity = async (userId: number, operation: string): Promise<void> => {
  const user = await User.query().findById(userId);
  if (!user) return;

  const currentActivity = Array.isArray(user.activity_log) ? user.activity_log : [];
  const newActivity: IActivityLog = {
    operation,
    performed_at: new Date().toISOString()
  };

  await User.query().patchAndFetchById(userId, {
    activity_log: [...currentActivity, newActivity]
  });
};

export const createUserService = async (data: ICreateUserDTO): Promise<User> => {
  try {
    const user = await User.query().insert({
      ...data,
      activity_log: data.activity_log || [
        { operation: "CREATE", performed_at: new Date().toISOString() }
      ]
    });

    return user;
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
};

export const loginUserService = async (
  email: string,
  password: string
): Promise<ILoginResponse | null> => {
  try {
    const user = await User.query().findOne({ email });

    if (!user || user.password !== password) {
      return null;
    }

    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      throw new Error("JWT secret is not configured");
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    await logUserActivity(user.id, "LOGIN");

    return {
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    };
  } catch (error) {
    console.error("Error logging in user:", error);
    throw error;
  }
};

export const getUsersService = async (
  search?: string,
  sortBy: string = "id",
  order: string = "asc",
  nulls: string = "last",
  page: number = 1,
  limit: number = 10
): Promise<IPaginatedUsers> => {
  try {
    let query = User.query().select("id", "name", "email", "activity_log");

    if (search && search.trim() !== "") {
      const searchTerm = `%${search.trim()}%`;
      query = query.where((builder) => {
        builder.where("name", "ILIKE", searchTerm).orWhere("email", "ILIKE", searchTerm);
      });
    }

    const allowedSortFields = ["id", "name", "email"];
    const requestedFields = sortBy.split(",").map((f) => f.trim());
    const requestedDirections = order.split(",").map((d) => d.trim().toLowerCase());

    const sortCriteria = requestedFields.map((field, index) => {
      const validField = allowedSortFields.includes(field) ? field : "id";
      const validDirection: OrderByDirection = requestedDirections[index] === "desc" ? "desc" : "asc";
      const validNulls: OrderByNulls = nulls.toLowerCase() === "first" ? "first" : "last";

      return {
        column: validField,
        order: validDirection,
        nulls: validNulls,
      };
    });

    query = query.orderBy(sortCriteria);

    const validPage = Math.max(1, page);
    const validLimit = Math.max(1, Math.min(100, limit));

    const paginatedResult = await query.page(validPage - 1, validLimit);

    return {
      results: paginatedResult.results,
      total: paginatedResult.total,
      page: validPage,
      limit: validLimit,
      totalPages: Math.ceil(paginatedResult.total / validLimit),
    };
  } catch (error) {
    console.error("Error getting users:", error);
    throw error;
  }
};

export const getUserByIdService = async (id: number): Promise<User | null> => {
  try {
    const user = await User.query().findById(id).select("id", "name", "email", "activity_log");

    if (!user) {
      return null;
    }

    await logUserActivity(user.id, "READ");

    return user;
  } catch (error) {
    console.error("Error getting user by ID:", error);
    throw error;
  }
};

export const updateUserService = async (
  id: number,
  data: IUpdateUserDTO
): Promise<User | null> => {
  try {
    const user = await User.query().findById(id);
    if (!user) return null;

    const currentActivity = Array.isArray(user.activity_log) ? user.activity_log : [];

    const updatedUser = await User.query().patchAndFetchById(id, {
      name: data.name,
      email: data.email,
      activity_log: [
        ...currentActivity,
        { operation: "UPDATE", performed_at: new Date().toISOString() }
      ]
    });

    return updatedUser;
  } catch (error) {
    console.error("Error updating user:", error);
    throw error;
  }
};

export const deleteUserService = async (id: number): Promise<User | null> => {
  try {
    const user = await User.query().findById(id);

    if (!user) {
      return null;
    }

    await User.query().deleteById(id);

    return user;
  } catch (error) {
    console.error("Error deleting user:", error);
    throw error;
  }
};

export const getUserActivityService = async (): Promise<IUserActivityResponse[]> => {
  try {
    const users = await User.query().select("id", "name", "email", "activity_log");
    return users.map((u) => ({
      userId: u.id,
      activity: u.activity_log || []
    }));
  } catch (error) {
    console.error("Error getting user activity:", error);
    throw error;
  }
};

export const getUserActivityByIdService = async (id: number): Promise<IActivityLog[]> => {
  try {
    const user = await User.query().findById(id).select("id", "activity_log");
    return user && user.activity_log ? user.activity_log : [];
  } catch (error) {
    console.error("Error getting user activity by ID:", error);
    throw error;
  }
};