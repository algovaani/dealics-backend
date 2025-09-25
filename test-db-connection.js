import "reflect-metadata";
import dotenv from "dotenv";
import { testDatabaseConnection } from "./src/config/db.js";

// Load environment variables
dotenv.config();

async function testConnection() {
  console.log("🔄 Testing database connection...");
  console.log("📋 Database Configuration:");
  console.log(`   Host: ${process.env.DB_HOST || "localhost"}`);
  console.log(`   Port: ${process.env.DB_PORT || "3306"}`);
  console.log(`   Database: ${process.env.DB_NAME || "stagingtradeblock"}`);
  console.log(`   User: ${process.env.DB_USER || "root"}`);
  console.log(`   Password: ${process.env.DB_PASSWORD ? "***SET***" : "***NOT SET***"}`);
  
  const isConnected = await testDatabaseConnection();
  
  if (isConnected) {
    console.log("✅ Database connection successful!");
    process.exit(0);
  } else {
    console.log("❌ Database connection failed!");
    process.exit(1);
  }
}

testConnection().catch(console.error);
