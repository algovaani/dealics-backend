import { Sequelize } from "sequelize-typescript";
export const sequelize = new Sequelize({
    database: "stagingtradeblock",
    username: "root",
    password: "",
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "3306"),
    dialect: "mysql",
    timezone: "+05:30",
    dialectOptions: {
        timezone: "+05:30"
    },
    logging: false,
});
