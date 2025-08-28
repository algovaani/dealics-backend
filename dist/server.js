import express from "express";
import { sequelize } from "./config/db.js";
import userRoutes from "./routes/user.routes.js";
const app = express();
app.use(express.json());
const PORT = process.env.PORT || 5000;
// Test route
app.get("/", (req, res) => {
    res.send("TypeScript + MySQL API running 🚀");
});
app.use("/api/users", userRoutes);
try {
    await sequelize.authenticate();
    console.log("✅ MySQL Connected!");
}
catch (err) {
    console.error("❌ DB Connection failed:", err);
}
console.log(`Server running at http://localhost:${PORT}`);
//# sourceMappingURL=server.js.map