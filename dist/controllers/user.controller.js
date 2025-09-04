import { UserService } from "../services/user.service.js";
const userService = new UserService();
// Helper function to send standardized API responses
const sendApiResponse = (res, statusCode, status, message, data) => {
    return res.status(statusCode).json({
        status,
        message,
        data: data || []
    });
};
export const getUsers = async (req, res) => {
    try {
        const users = await userService.getAllUsers();
        return sendApiResponse(res, 200, true, "Users retrieved successfully", users);
    }
    catch (error) {
        console.error("Error getting users:", error);
        return sendApiResponse(res, 500, false, error.message || "Internal server error", []);
    }
};
export const getUser = async (req, res) => {
    try {
        const user = await userService.getUserById(Number(req.params.id));
        if (!user) {
            return sendApiResponse(res, 404, false, "User not found", []);
        }
        return sendApiResponse(res, 200, true, "User retrieved successfully", [user]);
    }
    catch (error) {
        console.error("Error getting user:", error);
        return sendApiResponse(res, 500, false, error.message || "Internal server error", []);
    }
};
export const createUser = async (req, res) => {
    try {
        const { name, email } = req.body;
        const user = await userService.createUser(name, email);
        return sendApiResponse(res, 201, true, "User created successfully", [user]);
    }
    catch (error) {
        console.error("Error creating user:", error);
        return sendApiResponse(res, 500, false, error.message || "Internal server error", []);
    }
};
export const updateUser = async (req, res) => {
    try {
        const { name, email } = req.body;
        const user = await userService.updateUser(Number(req.params.id), name, email);
        if (!user) {
            return sendApiResponse(res, 404, false, "User not found", []);
        }
        return sendApiResponse(res, 200, true, "User updated successfully", [user]);
    }
    catch (error) {
        console.error("Error updating user:", error);
        return sendApiResponse(res, 500, false, error.message || "Internal server error", []);
    }
};
export const deleteUser = async (req, res) => {
    try {
        const success = await userService.deleteUser(Number(req.params.id));
        if (!success) {
            return sendApiResponse(res, 404, false, "User not found", []);
        }
        return sendApiResponse(res, 200, true, "User deleted successfully", []);
    }
    catch (error) {
        console.error("Error deleting user:", error);
        return sendApiResponse(res, 500, false, error.message || "Internal server error", []);
    }
};
//# sourceMappingURL=user.controller.js.map