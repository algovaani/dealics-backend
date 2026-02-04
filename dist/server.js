import "reflect-metadata";
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
dotenv.config();
import { sequelize } from "./config/db.js";
import { fixDatabaseSchema } from "./config/fixDatabaseSchema.js";
import { models, setupAssociations } from "./models/index.js";
import { EmailTemplete } from "./models/emailTemplate.model.js";
import { Setting } from "./models/setting.model.js";
import { MailQueue } from "./models/mailQueue.model.js";
import { InterestedIn } from "./models/interestedIn.model.js";
sequelize.addModels([...models, EmailTemplete, Setting, MailQueue, InterestedIn]);
setupAssociations();
import userRoutes from "./routes/user.routes.js";
import authRoutes from "./routes/auth.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import tradingcardRoutes from "./routes/tradingcard.routes.js";
import adminTradingcardRoutes from "./routes/admin/tradingcard.routes.js";
import userTradingcardRoutes from "./routes/user/tradingcard.routes.js";
import userTradingcardFieldsRoutes from "./routes/user/tradingcardfields.routes.js";
import sliderRoutes from "./routes/slider.routes.js";
import emailRoutes from "./routes/email.routes.js";
import supportRoutes from "./routes/support.routes.js";
import blockRoutes from "./routes/block.routes.js";
import membershipRoutes from "./routes/membership.routes.js";
import transactionRoutes from "./routes/transaction.routes.js";
import earnCreditRoutes from "./routes/earnCredit.routes.js";
import { noCache } from "./middlewares/noCache.middleware.js";
const app = express();
app.use(cors({
    origin: function (origin, callback) {
        if (!origin)
            return callback(null, true);
        return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin',
        'Access-Control-Allow-Origin',
        'Access-Control-Allow-Headers',
        'Access-Control-Allow-Methods',
        'Access-Control-Allow-Credentials'
    ],
    exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar'],
    optionsSuccessStatus: 200
}));
app.use(express.json({
    limit: '10mb'
}));
app.use(express.urlencoded({
    limit: '10mb',
    extended: true
}));
app.use('/user', express.static('public/user'));
app.use('/api', noCache);
const PORT = process.env.PORT || 5000;
process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection at:", promise, "reason:", reason);
});
process.on("uncaughtException", (err) => {
    console.error("Uncaught Exception:", err);
});
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
app.use("/api/user", userRoutes);
app.use("/api/sliders", sliderRoutes);
app.use("/api/email", emailRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/blocks", blockRoutes);
app.use("/api/memberships", membershipRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/earn-credits", earnCreditRoutes);
app.use((req, res) => {
    res.status(404).json({
        status: false,
        message: `Route not found: ${req.method} ${req.originalUrl}`
    });
});
const start = async () => {
    try {
        await sequelize.authenticate();
        await fixDatabaseSchema();
        await sequelize.sync({ force: false, alter: false });
        app.listen(PORT, () => {
        });
    }
    catch (err) {
        console.error("❌ DB Connection failed:", err);
        process.exit(1);
    }
};
start();
