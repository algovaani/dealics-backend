import "reflect-metadata";
import express from "express";
import cors from "cors";
import { sequelize } from "./config/db.js";
import { fixDatabaseSchema } from "./config/fixDatabaseSchema.js";
import { User } from "./models/user.model.js";
import { Category } from "./models/category.model.js";
import { TradingCard } from "./models/tradingcard.model.js";
import { CategoryField } from "./models/categoryField.model.js";
import { CardCondition } from "./models/cardCondition.model.js";
import { EmailTemplete } from "./models/emailTemplate.model.js";
import { Setting } from "./models/setting.model.js";
import { MailQueue } from "./models/mailQueue.model.js";
// Add models to Sequelize instance
sequelize.addModels([User, Category, TradingCard, CategoryField, CardCondition, EmailTemplete, Setting, MailQueue]);
import userRoutes from "./routes/user.routes.js";
import authRoutes from "./routes/auth.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import tradingcardRoutes from "./routes/tradingcard.routes.js";
import adminTradingcardRoutes from "./routes/admin/tradingcard.routes.js";
import userTradingcardRoutes from "./routes/user/tradingcard.routes.js";
import userTradingcardFieldsRoutes from "./routes/user/tradingcardfields.routes.js";
import sliderRoutes from "./routes/slider.routes.js";
import emailRoutes from "./routes/email.routes.js";
const app = express();
// Configure CORS to allow all origins
app.use(cors({
    origin: true, // Allow all origins
    credentials: true, // Allow credentials (cookies, authorization headers)
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], // Allow all HTTP methods
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'], // Allow common headers
    exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar'] // Expose additional headers if needed
}));
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
app.use("/api/user/tradingcards", userTradingcardRoutes);
app.use("/api/user/trading-cards-fields", userTradingcardFieldsRoutes);
app.use("/api/sliders", sliderRoutes);
app.use("/api/email", emailRoutes);
// Add a catch-all route to log all incoming requests
app.use((req, res, next) => {
    console.log(`🔍 Request: ${req.method} ${req.originalUrl}`);
    console.log(`   Headers:`, req.headers);
    console.log(`   Body:`, req.body);
    next();
});
// Add a 404 handler for unmatched routes
app.use((req, res) => {
    console.log(`❌ 404 - Route not found: ${req.method} ${req.originalUrl}`);
    res.status(404).json({
        status: false,
        message: `Route not found: ${req.method} ${req.originalUrl}`,
        timestamp: new Date().toISOString()
    });
});
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