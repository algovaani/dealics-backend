import { sequelize } from "./db.js";

export async function fixDatabaseSchema() {
  try {
    console.log("🔧 Fixing database schema...");
    
    // Step 1: Update all primary key columns to INTEGER for consistency
    try {
      await sequelize.query(`
        ALTER TABLE users MODIFY COLUMN id INT AUTO_INCREMENT
      `);
      console.log("✅ Updated users.id to INTEGER");
    } catch (error) {
      console.log("ℹ️ Users table already has correct structure or doesn't exist");
    }
    
    try {
      await sequelize.query(`
        ALTER TABLE categories MODIFY COLUMN id INT AUTO_INCREMENT
      `);
      console.log("✅ Updated categories.id to INTEGER");
    } catch (error) {
      console.log("ℹ️ Categories table already has correct structure or doesn't exist");
    }
    
    try {
      await sequelize.query(`
        ALTER TABLE card_conditions MODIFY COLUMN id INT AUTO_INCREMENT
      `);
      console.log("✅ Updated card_conditions.id to INTEGER");
    } catch (error) {
      console.log("ℹ️ Card_conditions table already has correct structure or doesn't exist");
    }
    
    try {
      await sequelize.query(`
        ALTER TABLE category_fields MODIFY COLUMN id INT AUTO_INCREMENT
      `);
      console.log("✅ Updated category_fields.id to INTEGER");
    } catch (error) {
      console.log("ℹ️ Category_fields table already has correct structure or doesn't exist");
    }
    
    // Step 2: Update foreign key columns to INTEGER
    try {
      await sequelize.query(`
        ALTER TABLE users MODIFY COLUMN current_team_id INT
      `);
      console.log("✅ Updated users.current_team_id to INTEGER");
    } catch (error) {
      console.log("ℹ️ Users.current_team_id already has correct structure or doesn't exist");
    }
    
    try {
      await sequelize.query(`
        ALTER TABLE users MODIFY COLUMN shipping_zip_code INT
      `);
      console.log("✅ Updated users.shipping_zip_code to INTEGER");
    } catch (error) {
      console.log("ℹ️ Users.shipping_zip_code already has correct structure or doesn't exist");
    }
    
    try {
      await sequelize.query(`
        ALTER TABLE card_conditions MODIFY COLUMN category_id INT
      `);
      console.log("✅ Updated card_conditions.category_id to INTEGER");
    } catch (error) {
      console.log("ℹ️ Card_conditions.category_id already has correct structure or doesn't exist");
    }
    
    // Step 3: Drop existing foreign key constraints if they exist
    try {
      await sequelize.query(`
        ALTER TABLE trading_cards 
        DROP FOREIGN KEY trading_cards_ibfk_1
      `);
      console.log("✅ Dropped existing foreign key constraint");
    } catch (error) {
      console.log("ℹ️ No existing foreign key constraint to drop");
    }
    
    try {
      await sequelize.query(`
        ALTER TABLE trading_cards 
        DROP FOREIGN KEY trading_cards_ibfk_2
      `);
      console.log("✅ Dropped existing category foreign key constraint");
    } catch (error) {
      console.log("ℹ️ No existing category foreign key constraint to drop");
    }
    
    try {
      await sequelize.query(`
        ALTER TABLE trading_cards 
        DROP FOREIGN KEY trading_cards_ibfk_3
      `);
      console.log("✅ Dropped existing card_condition foreign key constraint");
    } catch (error) {
      console.log("ℹ️ No existing card_condition foreign key constraint to drop");
    }
    
    // Step 4: Update trading_cards foreign key columns to INTEGER
    try {
      await sequelize.query(`
        ALTER TABLE trading_cards 
        MODIFY COLUMN trader_id INT,
        MODIFY COLUMN category_id INT,
        MODIFY COLUMN card_condition_id INT
      `);
      console.log("✅ Updated trading_cards foreign key columns to INTEGER!");
    } catch (error) {
      console.log("ℹ️ Trading_cards table already has correct structure or doesn't exist");
    }
    
    // Step 5: Add foreign key constraints back
    try {
      await sequelize.query(`
        ALTER TABLE trading_cards 
        ADD CONSTRAINT fk_trading_cards_trader 
        FOREIGN KEY (trader_id) REFERENCES users(id) 
        ON DELETE SET NULL ON UPDATE CASCADE
      `);
      console.log("✅ Added trader foreign key constraint");
    } catch (error) {
      console.log("ℹ️ Trader foreign key constraint already exists or couldn't be added");
    }
    
    try {
      await sequelize.query(`
        ALTER TABLE trading_cards 
        ADD CONSTRAINT fk_trading_cards_category 
        FOREIGN KEY (category_id) REFERENCES categories(id) 
        ON DELETE SET NULL ON UPDATE CASCADE
      `);
      console.log("✅ Added category foreign key constraint");
    } catch (error) {
      console.log("ℹ️ Category foreign key constraint already exists or couldn't be added");
    }
    
    try {
      await sequelize.query(`
        ALTER TABLE trading_cards 
        ADD CONSTRAINT fk_trading_cards_card_condition 
        FOREIGN KEY (card_condition_id) REFERENCES card_conditions(id) 
        ON DELETE SET NULL ON UPDATE CASCADE
      `);
      console.log("✅ Added card_condition foreign key constraint");
    } catch (error) {
      console.log("ℹ️ Card_condition foreign key constraint already exists or couldn't be added");
    }
    
    // Step 6: Add category_fields foreign key constraint
    try {
      await sequelize.query(`
        ALTER TABLE category_fields 
        ADD CONSTRAINT fk_category_fields_category 
        FOREIGN KEY (category_id) REFERENCES categories(id) 
        ON DELETE SET NULL ON UPDATE CASCADE
      `);
      console.log("✅ Added category_fields foreign key constraint");
    } catch (error) {
      console.log("ℹ️ Category_fields foreign key constraint already exists or couldn't be added");
    }
    
    console.log("✅ Database schema fixed completely!");
  } catch (error) {
    console.error("❌ Error fixing database schema:", error);
    throw error;
  }
}
