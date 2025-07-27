-- Add token tracking columns to chat_messages table
ALTER TABLE chat_messages 
ADD COLUMN IF NOT EXISTS input_tokens INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS output_tokens INTEGER DEFAULT 0;

-- Update existing records to have 0 tokens (since we can't retroactively calculate them)
UPDATE chat_messages 
SET input_tokens = 0, output_tokens = 0 
WHERE input_tokens IS NULL OR output_tokens IS NULL;