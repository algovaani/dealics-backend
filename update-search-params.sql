-- Simple SQL script to populate search_param for trading cards
UPDATE trading_cards 
SET search_param = CONCAT(
  COALESCE(trading_card_slug, ''),
  ' ',
  COALESCE(code, ''),
  ' ',
  COALESCE(trading_card_estimated_value, '')
)
WHERE search_param IS NULL OR search_param = '';

-- Check the results
SELECT id, trading_card_slug, code, trading_card_estimated_value, search_param 
FROM trading_cards 
LIMIT 5;
