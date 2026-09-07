import { User } from "../models/user.model";

export interface ILoginDTO {
  email: string;
  password: string;
}

export const loginService = async (credentials: ILoginDTO): Promise<User | null> => {
  try {
    const user = await User.query().findOne({ email: credentials.email });

    if (!user || user.password !== credentials.password) {
      return null;
    }

    return user;
  } catch (error) {
    console.error("Error during login:", error);
    throw error;
  }
};