-- Add user preference for including body information in LLM prompts
ALTER TABLE users ADD COLUMN include_body_in_prompts BOOLEAN DEFAULT true;

-- Add comment to document the column
COMMENT ON COLUMN users.include_body_in_prompts IS 'User preference: whether to include their body information in LLM prompts (only applies when body info is provided)';