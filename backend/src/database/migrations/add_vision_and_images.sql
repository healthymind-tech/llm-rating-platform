-- Add supports_vision flag to llm_configs and images array to chat_messages
ALTER TABLE llm_configs 
ADD COLUMN IF NOT EXISTS supports_vision BOOLEAN DEFAULT false;

ALTER TABLE chat_messages 
ADD COLUMN IF NOT EXISTS images TEXT[];

