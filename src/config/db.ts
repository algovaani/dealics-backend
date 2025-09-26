import { Sequelize } from "sequelize-typescript";

export const sequelize = new Sequelize({
  database: process.env.DB_NAME || "stagingtradeblock",
  username: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "3306") as number,
  dialect: "mysql",
  logging: process.env.NODE_ENV === "development" ? console.log : false,
});
