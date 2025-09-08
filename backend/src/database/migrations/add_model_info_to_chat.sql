-- Migration: Add model tracking to chat history

-- Add model_id to chat_sessions to track which model was used for the session
ALTER TABLE chat_sessions 
ADD COLUMN IF NOT EXISTS model_id UUID REFERENCES llm_configs(id);

-- Add model info to chat_messages for detailed tracking
ALTER TABLE chat_messages 
ADD COLUMN IF NOT EXISTS model_id UUID REFERENCES llm_configs(id),
ADD COLUMN IF NOT EXISTS model_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS model_type VARCHAR(20);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_sessions_model_id ON chat_sessions(model_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_model_id ON chat_messages(model_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_model_name ON chat_messages(model_name);
CREATE INDEX IF NOT EXISTS idx_chat_messages_model_type ON chat_messages(model_type);

-- Update existing records to include model information if possible
-- This will set model info for existing assistant messages based on the default LLM
UPDATE chat_messages 
SET model_id = (SELECT id FROM llm_configs WHERE is_default = true LIMIT 1),
    model_name = (SELECT name FROM llm_configs WHERE is_default = true LIMIT 1),
    model_type = (SELECT type FROM llm_configs WHERE is_default = true LIMIT 1)
WHERE role = 'assistant' AND model_id IS NULL;

-- Update existing sessions to include model information
UPDATE chat_sessions 
SET model_id = (SELECT id FROM llm_configs WHERE is_default = true LIMIT 1)
WHERE model_id IS NULL;
