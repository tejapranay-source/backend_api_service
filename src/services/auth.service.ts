import jwt, { SignOptions } from "jsonwebtoken";
import { User, IActivityLog } from "../models/user.model";
import { env } from "../config/env.config";

export interface ILoginDTO {
  email: string;
  password: string;
}

export interface IAuthResponse {
  user: User;
  token: string;
}

// Dummy hash used to enforce constant-time execution against non-existent accounts
const DUMMY_HASH = "$2b$12$e80yJp9eF21Nf3S/15w6e.7533mG910lYfN6/09X27h33M5Xn29iS";

export const loginService = async (
  credentials: ILoginDTO,
  ipAddress?: string,
  userAgent?: string
): Promise<IAuthResponse | null> => {
  const normalizedEmail = credentials.email.trim().toLowerCase();

  // 1. Fetch user by email
  const user = await User.query().findOne({ email: normalizedEmail });

  // 2. Prevent timing-attack user enumeration
  if (!user) {
    // Perform dummy hash comparison to mirror computation time
    await User.prototype.verifyPassword.call({ password: DUMMY_HASH }, credentials.password);
    return null;
  }

  // 3. Verify bcrypt password hash
  const isValidPassword = await user.verifyPassword(credentials.password);

  if (!isValidPassword) {
    return null;
  }

  // 4. Record audit activity log entry
  const newActivity: IActivityLog = {
    operation: "USER_LOGIN_SUCCESS",
    performed_at: new Date().toISOString(),
    ip_address: ipAddress ?? undefined,
    user_agent: userAgent ?? undefined,
  };

  const updatedActivityLog = [...(user.activity_log || []), newActivity];

  await User.query()
    .findById(user.id)
    .patch({ activity_log: updatedActivityLog });

  // 5. Generate signed JWT token
  const jwtOptions: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
  };

  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
    },
    env.JWT_SECRET,
    jwtOptions
  );

  return {
    user,
    token,
  };
};