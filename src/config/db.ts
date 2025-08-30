import { Sequelize } from "sequelize-typescript";
import { User } from "../models/user.model.js";
import { Category } from "../models/category.model.js";
import { TradingCard } from "../models/tradingcard.model.js";
import { CategoryField } from "../models/category_field.model.js";
import { CardCondition } from "../models/cardCondition.model.js";

export const sequelize = new Sequelize({
  database: "stagingtradeblock",
  username: "root",
  password: "",
  host: "localhost",
  dialect: "mysql",
  // models: [User], // switch to explicit addModels below
  logging: false,
});

// Explicitly register models to ensure initialization
import { Slider } from "../models/slider.model.js";
sequelize.addModels([User, Category, TradingCard, Slider, CategoryField, CardCondition]);