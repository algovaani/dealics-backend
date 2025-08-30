-- Manual SQL script to fix foreign key constraint issues
-- Run this in your MySQL database step by step

-- Step 1: Update all primary key columns to INTEGER for consistency
ALTER TABLE users MODIFY COLUMN id INT AUTO_INCREMENT;
ALTER TABLE categories MODIFY COLUMN id INT AUTO_INCREMENT;
ALTER TABLE card_conditions MODIFY COLUMN id INT AUTO_INCREMENT;
ALTER TABLE category_fields MODIFY COLUMN id INT AUTO_INCREMENT;

-- Step 2: Update foreign key columns to INTEGER
ALTER TABLE users MODIFY COLUMN current_team_id INT;
ALTER TABLE users MODIFY COLUMN shipping_zip_code INT;
ALTER TABLE card_conditions MODIFY COLUMN category_id INT;

-- Step 3: Drop existing foreign key constraints (if they exist)
-- Note: These commands may fail if constraints don't exist - that's OK
ALTER TABLE trading_cards DROP FOREIGN KEY trading_cards_ibfk_1;
ALTER TABLE trading_cards DROP FOREIGN KEY trading_cards_ibfk_2;
ALTER TABLE trading_cards DROP FOREIGN KEY trading_cards_ibfk_3;

-- Step 4: Update trading_cards foreign key columns to INTEGER
ALTER TABLE trading_cards MODIFY COLUMN trader_id INT;
ALTER TABLE trading_cards MODIFY COLUMN category_id INT;
ALTER TABLE trading_cards MODIFY COLUMN card_condition_id INT;

-- Step 4: Add foreign key constraints back with proper names
ALTER TABLE trading_cards 
ADD CONSTRAINT fk_trading_cards_trader 
FOREIGN KEY (trader_id) REFERENCES users(id) 
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE trading_cards 
ADD CONSTRAINT fk_trading_cards_category 
FOREIGN KEY (category_id) REFERENCES categories(id) 
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE trading_cards 
ADD CONSTRAINT fk_trading_cards_card_condition 
FOREIGN KEY (card_condition_id) REFERENCES card_conditions(id) 
ON DELETE SET NULL ON UPDATE CASCADE;

-- Step 5: Verify the changes
DESCRIBE trading_cards;
DESCRIBE users;
DESCRIBE categories;
DESCRIBE card_conditions;
DESCRIBE category_fields;

-- Step 6: Check foreign key constraints
SELECT 
    CONSTRAINT_NAME,
    TABLE_NAME,
    COLUMN_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM 
    INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
WHERE 
    TABLE_SCHEMA = 'stagingtradeblock' 
    AND TABLE_NAME = 'trading_cards';
