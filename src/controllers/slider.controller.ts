import { Request, Response } from "express";
import { Slider } from "../models/slider.model.js";

export const getActiveSliders = async (req: Request, res: Response) => {
  try {
    const sliders = await Slider.findAll({ where: { status: 1 } });
    res.json(sliders);
  } catch (error) {
    res.status(500).json({ message: "Internal server error", error });
  }
};
