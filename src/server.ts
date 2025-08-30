import "reflect-metadata";
import express from "express";
import { sequelize } from "./config/db.js";
import { fixDatabaseSchema } from "./config/fixDatabaseSchema.js";

// Import models
import { User } from "./models/user.model.js";
import { Category } from "./models/category.model.js";
import { TradingCard } from "./models/tradingcard.model.js";
import { CategoryField } from "./models/category_field.model.js";
import { CardCondition } from "./models/cardCondition.model.js";
import { Slider } from "./models/slider.model.js";

// Import routes
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

// Health check endpoint for Kubernetes
app.get("/health", async (req, res) => {
  try {
    // Check database connection
    await sequelize.authenticate();
    res.status(200).json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      database: "connected",
      uptime: process.uptime()
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      database: "disconnected",
      error: errorMessage,
      uptime: process.uptime()
    });
  }
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
    console.log("🚀 Starting server...");
    
    // Register models first
    sequelize.addModels([User, Category, TradingCard, CategoryField, CardCondition, Slider]);
    console.log("✅ Models registered!");
    
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
  } catch (err) {
    console.error("❌ Server startup failed:", err);
    if (err instanceof Error) {
      console.error("Error details:", err.message);
      console.error("Stack trace:", err.stack);
    }
    process.exit(1);
  }
};

start();
