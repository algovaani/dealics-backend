-- Fix database schema to match TypeScript models
-- Run this script in your MySQL database

-- Fix trading_cards table column types
ALTER TABLE trading_cards 
MODIFY COLUMN trader_id BIGINT,
MODIFY COLUMN category_id BIGINT,
MODIFY COLUMN card_condition_id BIGINT;

-- Fix users table id column type (if needed)
ALTER TABLE users MODIFY COLUMN id BIGINT AUTO_INCREMENT;

-- Fix categories table id column type (if needed)
ALTER TABLE categories MODIFY COLUMN id BIGINT AUTO_INCREMENT;

-- Fix card_conditions table id column type (if needed)
ALTER TABLE card_conditions MODIFY COLUMN id BIGINT AUTO_INCREMENT;

-- Fix category_fields table id column type (if needed)
ALTER TABLE category_fields MODIFY COLUMN id BIGINT AUTO_INCREMENT;

-- Verify the changes
DESCRIBE trading_cards;
DESCRIBE users;
DESCRIBE categories;
DESCRIBE card_conditions;
DESCRIBE category_fields;
