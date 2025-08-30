import { Sequelize } from "sequelize-typescript";

export const sequelize = new Sequelize({
  database: "stagingtradeblock",
  username: "root",
  password: "",
  host: "localhost",
  dialect: "mysql",
  logging: false,
  models: [], // Start with empty models array
});

// We'll add models after they're imported in the main server file