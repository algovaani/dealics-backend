import { Sequelize } from "sequelize-typescript";
import mysql from "mysql2";   // ✅ add this

export const sequelize = new Sequelize({
  database: "stagingtradeblock",
  username: "root",
  password: "RockyLinux@DB1",
  host: "localhost",
  port: 3306,
  dialect: "mysql",
  dialectModule: mysql,   // ✅ use imported mysql
  logging: false,
});

// We'll add models after they're imported in the main server file
