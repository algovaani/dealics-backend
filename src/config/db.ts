import { Sequelize } from "sequelize-typescript";

export const sequelize = new Sequelize({
  database: "stagingtradeblock",
  username: "root",
  password: "RockyLinux@DB1",
  host: "localhost",
  port: 3306,
  dialect: "mysql",
  dialectModule: require("mysql2"),
  logging: false,
});

// We'll add models after they're imported in the main server file