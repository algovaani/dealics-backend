import "reflect-metadata";
import express from "express";
import { sequelize } from "./config/db.js";
import { fixDatabaseSchema } from "./config/fixDatabaseSchema.js";
import "./models/user.model.js";
import "./models/category.model.js";
import "./models/tradingcard.model.js";
import "./models/category_field.model.js";
import "./models/cardCondition.model.js";
import userRoutes from "./routes/user.routes.js";
import authRoutes from "./routes/auth.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import tradingcardRoutes from "./routes/tradingcard.routes.js";
import adminTradingcardRoutes from "./routes/admin/tradingcard.routes.js";
import userTradingcardRoutes from "./routes/user/tradingcard.routes.js";
import userTradingcardFieldsRoutes from "./routes/user/tradingcardfields.routes.js";
import sliderRoutes from "./routes/slider.routes.js";
const app = express();
app.use(express.json());
const PORT = process.env.PORT || 5000;
process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection at:", promise, "reason:", reason);
});
process.on("uncaughtException", (err) => {
    console.error("Uncaught Exception:", err);
});
// Test route
app.get("/", (req, res) => {
    res.send("TypeScript + MySQL API running 🚀");
});
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/tradingCards", tradingcardRoutes);
app.use("/api/admin/tradingCards", adminTradingcardRoutes);
app.use("/api/user/tradingCards", userTradingcardRoutes);
app.use("/api/user/trading-cards-fields", userTradingcardFieldsRoutes);
app.use("/api/sliders", sliderRoutes);
const start = async () => {
    try {
        await sequelize.authenticate();
        console.log("✅ MySQL Connected!");
        // Fix database schema first
        await fixDatabaseSchema();
        // Sync models without altering (to avoid foreign key constraint issues)
        await sequelize.sync({ force: false, alter: false });
        console.log("✅ Models synchronized!");
        app.listen(PORT, () => {
            console.log(`Server running at http://localhost:${PORT}`);
        });
    }
    catch (err) {
        console.error("❌ DB Connection failed:", err);
        process.exit(1);
    }
};
start();
//# sourceMappingURL=server.js.map