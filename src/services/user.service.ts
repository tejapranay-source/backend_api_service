import jwt, { SignOptions } from "jsonwebtoken";
import { OrderByDirection, OrderByNulls } from "objection";
import { User, IActivityLog } from "../models/user.model";
import { env } from "../config/env.config";

export interface ICreateUserDTO {
  name: string;
  email: string;
  password: string;
  activity_log?: IActivityLog[];
}

export interface IUpdateUserDTO {
  name?: string;
  email?: string;
}

export interface ILoginDTO {
  email?: string;
  password?: string;
}

export interface IUserQueryParams {
  q?: string;
  search?: string;
  sortBy?: string;
  order?: string;
  nulls?: string;
  page?: number;
  limit?: number;
}

export interface ILoginResponse {
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

// Dummy hash used for constant-time comparison on non-existent emails
const DUMMY_HASH = "$2b$12$e80yJp9eF21Nf3S/15w6e.7533mG910lYfN6/09X27h33M5Xn29iS";

// Helper method to safely append activity logs inside open transactions
const appendUserActivityTrx = async (
  trx: any,
  userId: number,
  operation: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> => {
  const user = await User.query(trx).findById(userId).forUpdate();
  if (!user) return;

  const currentActivity = Array.isArray(user.activity_log) ? user.activity_log : [];
  const newActivity: IActivityLog = {
    operation,
    performed_at: new Date().toISOString(),
    ...(ipAddress && { ip_address: ipAddress }),
    ...(userAgent && { user_agent: userAgent }),
  };

  await User.query(trx).patchAndFetchById(userId, {
    activity_log: [...currentActivity, newActivity],
  });
};

/**
 * Creates a new user record safely inside a database transaction.
 */
export const createUserService = async (
  data: ICreateUserDTO,
  _idempotencyKey?: string
): Promise<User> => {
  return await User.transaction(async (trx) => {
    const normalizedEmail = data.email.trim().toLowerCase();

    // Check email uniqueness explicitly
    const existing = await User.query(trx).findOne({ email: normalizedEmail });
    if (existing) {
      const error: any = new Error("An account with this email already exists.");
      error.status = 409;
      error.code = "EMAIL_ALREADY_EXISTS";
      throw error;
    }

    const initialActivity: IActivityLog[] = data.activity_log || [
      { operation: "ACCOUNT_CREATED", performed_at: new Date().toISOString() },
    ];

    // Password hashing handled automatically by User model $beforeInsert hook
    const user = await User.query(trx).insertAndFetch({
      name: data.name,
      email: normalizedEmail,
      password: data.password,
      activity_log: initialActivity,
    });

    return user;
  });
};

/**
 * Validates credentials and generates access token without side-channel timing leaks.
 */
export const loginUserService = async (
  email: string,
  password: string,
  ipAddress?: string,
  userAgent?: string
): Promise<ILoginResponse | null> => {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await User.query().findOne({ email: normalizedEmail });

  if (!user) {
    // Constant-time execution defense
    await User.prototype.verifyPassword.call({ password: DUMMY_HASH }, password);
    return null;
  }

  const isValidPassword = await user.verifyPassword(password);
  if (!isValidPassword) {
    return null;
  }

  return await User.transaction(async (trx) => {
    await appendUserActivityTrx(trx, user.id, "USER_LOGIN_SUCCESS", ipAddress, userAgent);

    const jwtOptions: SignOptions = {
      expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
    };

    const token = jwt.sign(
      { id: user.id, email: user.email },
      env.JWT_SECRET,
      jwtOptions
    );

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    };
  });
};

/**
 * Gets paginated and safely filtered users.
 */
export const getUsersService = async (
  search?: string,
  sortBy: string = "id",
  order: string = "asc",
  nulls: string = "last",
  page: number = 1,
  limit: number = 10
): Promise<IPaginatedUsers> => {
  let query = User.query().select("id", "name", "email", "created_at");

  if (search && search.trim() !== "") {
    const searchTerm = `%${search.trim()}%`;
    query = query.where((builder) => {
      builder.where("name", "ILIKE", searchTerm).orWhere("email", "ILIKE", searchTerm);
    });
  }

  const allowedSortFields = new Set(["id", "name", "email", "created_at"]);
  const requestedFields = sortBy.split(",").map((f) => f.trim());
  const requestedDirections = order.split(",").map((d) => d.trim().toLowerCase());

  const sortCriteria = requestedFields.map((field, index) => {
    const validField = allowedSortFields.has(field) ? field : "id";
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
};

/**
 * Retrieves a user record by ID.
 */
export const getUserByIdService = async (id: number): Promise<User | null> => {
  const user = await User.query().findById(id).select("id", "name", "email", "activity_log", "created_at");
  return user || null;
};

/**
 * Updates user attributes safely using row-level locking.
 */
export const updateUserService = async (
  id: number,
  data: IUpdateUserDTO
): Promise<User | null> => {
  return await User.transaction(async (trx) => {
    const user = await User.query(trx).findById(id).forUpdate();
    if (!user) return null;

    const currentActivity = Array.isArray(user.activity_log) ? user.activity_log : [];
    const patchPayload: Record<string, any> = {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.email !== undefined && { email: data.email.trim().toLowerCase() }),
      activity_log: [
        ...currentActivity,
        { operation: "ACCOUNT_UPDATED", performed_at: new Date().toISOString() },
      ],
    };

    const updatedUser = await User.query(trx).patchAndFetchById(id, patchPayload);
    return updatedUser;
  });
};

/**
 * Deletes a user record.
 */
export const deleteUserService = async (id: number): Promise<User | null> => {
  return await User.transaction(async (trx) => {
    const user = await User.query(trx).findById(id).forUpdate();
    if (!user) return null;

    await User.query(trx).deleteById(id);
    return user;
  });
};

/**
 * Activity log aggregations.
 */
export const getUserActivityService = async (): Promise<IUserActivityResponse[]> => {
  const users = await User.query().select("id", "activity_log");
  return users.map((u) => ({
    userId: u.id,
    activity: u.activity_log || [],
  }));
};

export const getUserActivityByIdService = async (id: number): Promise<IActivityLog[]> => {
  const user = await User.query().findById(id).select("id", "activity_log");
  return user && user.activity_log ? user.activity_log : [];
};