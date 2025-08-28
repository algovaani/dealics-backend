import { Request, Response } from "express";
import { AuthService } from "../services/auth.service.js";

const authService = new AuthService();

export const login = async (req: Request, res: Response) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) {
    return res.status(400).json({ status: false, code: 400, message: "email/user name and password are required" });
  }
  const user = await authService.validateUser(identifier, password);
  if (!user) return res.status(401).json({ status: false, code: 401, message: "Invalid credentials" });
  const token = authService.issueToken(user);
  res.status(200).json({ status: true, code: 200, token });
};

export const register = async (req: Request, res: Response) => {
  try {
    const user = await authService.register(req.body);
    const token = authService.issueToken(user);
    res.status(201).json({ status: true, code: 201, token });
  } catch (err: any) {
    res.status(400).json({ status: false, code: 400, message: err.message ?? "Registration failed" });
  }
};


