import { Request, Response } from "express";
import { CategoryField } from "../models/category_field.model.js";

export const getCategoryFields = async (req: Request, res: Response) => {
  try {
    const categoryId = req.query.category_id;
    let fields;
    if (categoryId) {
      const catIdNum = Array.isArray(categoryId) ? Number(categoryId[0]) : Number(categoryId);
      fields = await CategoryField.findAll({ where: { category_id: catIdNum } });
    } else {
      fields = await CategoryField.findAll();
    }
    res.json(fields);
  } catch (error) {
    res.status(500).json({ message: "Internal server error", error });
  }
};
