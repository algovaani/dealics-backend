import { User } from "../models/index.js";

export class UserService {
  // Get all users
  async getAllUsers() {
    return await User.findAll();
  }

  // Get user by ID
  async getUserById(id: number) {
    return await User.findByPk(id);
  }

  // Create new user
  async createUser(name: string, email: string) {
    return await User.create({ name, email } as any);
  }

  // Update user
  async updateUser(id: number, name: string, email: string) {
    const user = await User.findByPk(id);
    if (!user) return null;
    user.email = email;
    await user.save();
    return user;
  }

  // Delete user
  async deleteUser(id: number) {
    const user = await User.findByPk(id);
    if (!user) return null;
    await user.destroy();
    return true;
  }
}
