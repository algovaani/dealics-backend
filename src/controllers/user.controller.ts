import { Request, Response } from "express";
import { UserService } from "../services/user.service.js";

const userService = new UserService();

export const getUsers = async (req: Request, res: Response) => {
  const users = await userService.getAllUsers();
  res.json(users);
};

export const getUser = async (req: Request, res: Response) => {
  const user = await userService.getUserById(Number(req.params.id));
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json(user);
};

export const createUser = async (req: Request, res: Response) => {
  const { name, email } = req.body;
  const user = await userService.createUser(name, email);
  res.status(201).json(user);
};

export const updateUser = async (req: Request, res: Response) => {
  const { name, email } = req.body;
  const user = await userService.updateUser(Number(req.params.id), name, email);
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json(user);
};

export const deleteUser = async (req: Request, res: Response) => {
  const success = await userService.deleteUser(Number(req.params.id));
  if (!success) return res.status(404).json({ message: "User not found" });
  res.json({ message: "User deleted" });
};
