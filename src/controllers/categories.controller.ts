import { Request, Response } from "express";
import { CategoryService } from "../services/categories.service.js";

const categoriesService = new CategoryService();

export const getCategories = async (req: Request, res: Response) => {
  const categories = await categoriesService.getAllCategories();
  res.json(categories);
};

export const getCategory = async (req: Request, res: Response) => {
  const category = await categoriesService.getCategoryById(Number(req.params.id));
  if (!category) return res.status(404).json({ message: "Category not found" });
  res.json(category);
};

// export const createCategory = async (req: Request, res: Response) => {
//   const { name, description } = req.body;
//   const category = await categoriesService.createCategory(name, description);
//   res.status(201).json(category);
// };

export const updateCategory = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
  
  const category = await categoriesService.updateCategory(id, req.body);
  if (!category) return res.status(404).json({ message: "Category not found" });
  res.json(category);
};

// export const deleteCategory = async (req: Request, res: Response) => {
//   const success = await categoriesService.deleteCategory(Number(req.params.id));
//   if (!success) return res.status(404).json({ message: "Category not found" });
//   res.json({ message: "Category deleted" });
// };
