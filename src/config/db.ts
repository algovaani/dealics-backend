import { Sequelize } from "sequelize-typescript";

export const sequelize = new Sequelize({
  database: process.env.DB_NAME || "stagingtradeblock",
  username: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "RockyLinux@DB1",
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "3306") as number,
  dialect: "mysql",
  // Force all date writes/reads to use UTC
  timezone: "+00:00",
  dialectOptions: {
    // Ensure MySQL driver treats times as UTC (Zulu)
    timezone: "Z"
  },
  logging: process.env.NODE_ENV === "development" ? console.log : false,
});
