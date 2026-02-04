-- Add is_edited column to trade_proposals table
ALTER TABLE `trade_proposals` 
ADD COLUMN `is_edited` TINYINT(1) NOT NULL DEFAULT 0 AFTER `shipped_on_by_trade_sent_by`;

-- Optional: Add index for better performance if needed
-- ALTER TABLE `trade_proposals` ADD INDEX `idx_trade_proposals_is_edited` (`is_edited`);
