-- Add system_prompt and repetition_penalty fields to llm_configs table (idempotent)
ALTER TABLE llm_configs 
ADD COLUMN IF NOT EXISTS system_prompt TEXT;

-- Align type/precision with current schema and ensure existence
ALTER TABLE llm_configs 
ADD COLUMN IF NOT EXISTS repetition_penalty DECIMAL(3,2) DEFAULT 1.0 CHECK (repetition_penalty >= 0.1 AND repetition_penalty <= 2.0);

-- Update existing records to have default repetition_penalty
UPDATE llm_configs SET repetition_penalty = 1.0 WHERE repetition_penalty IS NULL;
