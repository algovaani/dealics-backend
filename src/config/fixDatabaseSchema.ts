import { sequelize } from "./db.js";

export async function fixDatabaseSchema() {
  try {
    
    // Step 1: Update all primary key columns to INTEGER for consistency
    try {
      await sequelize.query(`
        ALTER TABLE users MODIFY COLUMN id INT AUTO_INCREMENT
      `);
    } catch (error) {
    }
    
    try {
      await sequelize.query(`
        ALTER TABLE categories MODIFY COLUMN id INT AUTO_INCREMENT
      `);
    } catch (error) {
    }
    
    try {
      await sequelize.query(`
        ALTER TABLE card_conditions MODIFY COLUMN id INT AUTO_INCREMENT
      `);
    } catch (error) {
    }
    
    try {
      await sequelize.query(`
        ALTER TABLE category_fields MODIFY COLUMN id INT AUTO_INCREMENT
      `);
    } catch (error) {
    }
    
    // Step 2: Update foreign key columns to INTEGER
    try {
      await sequelize.query(`
        ALTER TABLE users MODIFY COLUMN current_team_id INT
      `);
    } catch (error) {
    }
    
    try {
      await sequelize.query(`
        ALTER TABLE users MODIFY COLUMN shipping_zip_code INT
      `);
    } catch (error) {
    }
    
    try {
      await sequelize.query(`
        ALTER TABLE card_conditions MODIFY COLUMN category_id INT
      `);
    } catch (error) {
    }
    
    // Step 3: Drop existing foreign key constraints if they exist
    try {
      await sequelize.query(`
        ALTER TABLE trading_cards 
        DROP FOREIGN KEY trading_cards_ibfk_1
      `);
    } catch (error) {
    }
    
    try {
      await sequelize.query(`
        ALTER TABLE trading_cards 
        DROP FOREIGN KEY trading_cards_ibfk_2
      `);
    } catch (error) {
    }
    
    try {
      await sequelize.query(`
        ALTER TABLE trading_cards 
        DROP FOREIGN KEY trading_cards_ibfk_3
      `);
    } catch (error) {
    }
    
    // Step 4: Update trading_cards foreign key columns to INTEGER
    try {
      await sequelize.query(`
        ALTER TABLE trading_cards 
        MODIFY COLUMN trader_id INT,
        MODIFY COLUMN category_id INT,
        MODIFY COLUMN card_condition_id INT
      `);
    } catch (error) {
    }
    
    // Step 5: Add foreign key constraints back
    try {
      await sequelize.query(`
        ALTER TABLE trading_cards 
        ADD CONSTRAINT fk_trading_cards_trader 
        FOREIGN KEY (trader_id) REFERENCES users(id) 
        ON DELETE SET NULL ON UPDATE CASCADE
      `);
    } catch (error) {
    }
    
    try {
      await sequelize.query(`
        ALTER TABLE trading_cards 
        ADD CONSTRAINT fk_trading_cards_category 
        FOREIGN KEY (category_id) REFERENCES categories(id) 
        ON DELETE SET NULL ON UPDATE CASCADE
      `);
    } catch (error) {
    }
    
    try {
      await sequelize.query(`
        ALTER TABLE trading_cards 
        ADD CONSTRAINT fk_trading_cards_card_condition 
        FOREIGN KEY (card_condition_id) REFERENCES card_conditions(id) 
        ON DELETE SET NULL ON UPDATE CASCADE
      `);
    } catch (error) {
    }
    
    // Step 6: Add category_fields foreign key constraint
    try {
      await sequelize.query(`
        ALTER TABLE category_fields 
        ADD CONSTRAINT fk_category_fields_category 
        FOREIGN KEY (category_id) REFERENCES categories(id) 
        ON DELETE SET NULL ON UPDATE CASCADE
      `);
    } catch (error) {
    }
    
  } catch (error) {
    console.error("❌ Error fixing database schema:", error);
    throw error;
  }
}
