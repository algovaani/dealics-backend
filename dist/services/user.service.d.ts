import { User } from "../models/index.js";
export declare class UserService {
    getAllUsers(): Promise<User[]>;
    getUserById(id: number): Promise<User | null>;
    createUser(name: string, email: string): Promise<User>;
    updateUser(id: number, name: string, email: string): Promise<User | null>;
    deleteUser(id: number): Promise<true | null>;
}
//# sourceMappingURL=user.service.d.ts.map