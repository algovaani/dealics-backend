import { Sequelize } from "sequelize-typescript";
export const sequelize = new Sequelize({
    database: "stagingtradeblock",
    username: "root",
    password: "",
    host: "localhost",
    dialect: "mysql",
    models: [new URL("../models", import.meta.url).pathname],
    logging: false,
});
//# sourceMappingURL=db.js.map