-- Add Azure provider support: extend type check and add api_version column
DO $$
BEGIN
    -- Add api_version column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='llm_configs' AND column_name='api_version'
    ) THEN
        ALTER TABLE llm_configs ADD COLUMN api_version VARCHAR(50);
    END IF;

    -- Update type check constraint to include 'azure'
    -- Try dropping a likely-named constraint, then add our own named one
    BEGIN
        ALTER TABLE llm_configs DROP CONSTRAINT IF EXISTS llm_configs_type_check;
    EXCEPTION WHEN undefined_object THEN
        -- ignore
    END;

    -- Also check for unnamed or differently named constraints matching the check; best-effort
    -- Add a new constraint that includes 'azure'
    BEGIN
        ALTER TABLE llm_configs
        ADD CONSTRAINT llm_configs_type_check
        CHECK (type IN ('openai', 'ollama', 'azure', 'vllm'));
    EXCEPTION WHEN duplicate_object THEN
        -- already exists
    END;
END $$;

