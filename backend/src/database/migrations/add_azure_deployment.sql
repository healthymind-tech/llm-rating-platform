-- Add deployment column for Azure (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='llm_configs' AND column_name='deployment'
    ) THEN
        ALTER TABLE llm_configs ADD COLUMN deployment VARCHAR(100);
    END IF;
END $$;

