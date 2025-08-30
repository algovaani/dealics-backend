import { User } from "../models/user.model.js";
export class UserService {
    // Get all users
    async getAllUsers() {
        return await User.findAll();
    }
    // Get user by ID
    async getUserById(id) {
        return await User.findByPk(id);
    }
    // Create new user
    async createUser(name, email) {
        return await User.create({ name, email });
    }
    // Update user
    async updateUser(id, name, email) {
        const user = await User.findByPk(id);
        if (!user)
            return null;
        user.email = email;
        await user.save();
        return user;
    }
    // Delete user
    async deleteUser(id) {
        const user = await User.findByPk(id);
        if (!user)
            return null;
        await user.destroy();
        return true;
    }
}
//# sourceMappingURL=user.service.js.map