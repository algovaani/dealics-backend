import { Sequelize } from "sequelize-typescript";
import { User } from "../models/user.model.js";
import { Category } from "../models/category.model.js";
import { TradingCard } from "../models/tradingcard.model.js";

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
sequelize.addModels([User,Category,TradingCard]);