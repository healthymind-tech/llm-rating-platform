-- Add support for vLLM provider type
-- This migration adds 'vllm' as a valid type for LLM configurations

-- Drop the existing constraint
ALTER TABLE llm_configs DROP CONSTRAINT IF EXISTS llm_configs_type_check;

-- Add the updated constraint that includes 'vllm'
ALTER TABLE llm_configs ADD CONSTRAINT llm_configs_type_check 
    CHECK (type IN ('openai', 'ollama', 'azure', 'vllm'));

-- Optional: Insert a sample vLLM configuration (commented out)
-- INSERT INTO llm_configs (name, type, endpoint, model, temperature, max_tokens, is_enabled, is_default) VALUES
-- ('vLLM Local', 'vllm', 'http://vllm:8000/v1', 'internvl3_5-1b', 0.7, 2048, false, false);