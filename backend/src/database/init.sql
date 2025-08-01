-- Create database if it doesn't exist
SELECT 'CREATE DATABASE llm_testing_platform'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'llm_testing_platform')\gexec

-- Connect to the database
\c llm_testing_platform;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(10) NOT NULL CHECK (role IN ('admin', 'user')),
    height DECIMAL(5,2), -- in cm
    weight DECIMAL(5,2), -- in kg
    body_fat DECIMAL(5,2), -- percentage (optional)
    lifestyle_habits TEXT, -- text description
    profile_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- Chat sessions table
CREATE TABLE chat_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Chat messages table
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(10) NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- LLM configurations table
CREATE TABLE llm_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('openai', 'ollama')),
    api_key TEXT,
    endpoint VARCHAR(255),
    model VARCHAR(100) NOT NULL,
    temperature DECIMAL(3,2) DEFAULT 0.7 CHECK (temperature >= 0 AND temperature <= 2),
    max_tokens INTEGER DEFAULT 2048 CHECK (max_tokens > 0),
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Message ratings table
CREATE TABLE message_ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    rating VARCHAR(10) NOT NULL CHECK (rating IN ('like', 'dislike')),
    reason TEXT, -- Reason for dislike (optional)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(message_id, user_id) -- One rating per user per message
);

-- Session ratings table
CREATE TABLE session_ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    rating VARCHAR(10) NOT NULL CHECK (rating IN ('like', 'dislike')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(session_id, user_id) -- One rating per user per session
);

-- Indexes for better performance
CREATE INDEX idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX idx_llm_configs_is_active ON llm_configs(is_active);
CREATE INDEX idx_message_ratings_message_id ON message_ratings(message_id);
CREATE INDEX idx_message_ratings_user_id ON message_ratings(user_id);
CREATE INDEX idx_message_ratings_rating ON message_ratings(rating);
CREATE INDEX idx_session_ratings_session_id ON session_ratings(session_id);
CREATE INDEX idx_session_ratings_user_id ON session_ratings(user_id);
CREATE INDEX idx_session_ratings_rating ON session_ratings(rating);

-- Triggers to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to update profile_completed flag
CREATE OR REPLACE FUNCTION update_profile_completed()
RETURNS TRIGGER AS $$
DECLARE
    require_body_info BOOLEAN;
BEGIN
    -- Check if body information is required
    SELECT CASE 
        WHEN setting_value = 'true' THEN TRUE 
        ELSE FALSE 
    END INTO require_body_info
    FROM system_settings 
    WHERE setting_key = 'require_user_body_info';
    
    -- If body info is not required, profile is always complete
    IF require_body_info IS NULL OR require_body_info = FALSE THEN
        NEW.profile_completed = TRUE;
    ELSE
        -- Check if required body information is provided
        NEW.profile_completed = (
            NEW.height IS NOT NULL AND 
            NEW.weight IS NOT NULL AND 
            NEW.lifestyle_habits IS NOT NULL AND 
            NEW.lifestyle_habits != ''
        );
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for profile completion
CREATE TRIGGER update_users_profile_completed 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_profile_completed();

CREATE TRIGGER update_chat_sessions_updated_at 
    BEFORE UPDATE ON chat_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_llm_configs_updated_at 
    BEFORE UPDATE ON llm_configs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_message_ratings_updated_at 
    BEFORE UPDATE ON message_ratings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_session_ratings_updated_at 
    BEFORE UPDATE ON session_ratings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default admin user (password: 'admin')
INSERT INTO users (username, email, password_hash, role) VALUES 
('admin', 'admin@healthymind-tech.com', '$2b$10$PtIk3fIwT04xn5TYsXVL0us53n/rtyxUpuD7bYamSA0tSCd9dDxxC', 'admin');

-- Insert default user (password: 'user')
INSERT INTO users (username, email, password_hash, role) VALUES 
('user', 'user@healthymind-tech.com', '$2b$10$smSMX7xkDNny6D7re8ViJe.xQEL754MwhlLZnpfcdpkX3KmJG6I9O', 'user');

-- System settings table
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    setting_type VARCHAR(20) NOT NULL CHECK (setting_type IN ('string', 'number', 'boolean', 'json')),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trigger for system_settings updated_at
CREATE TRIGGER update_system_settings_updated_at 
    BEFORE UPDATE ON system_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default system settings
INSERT INTO system_settings (setting_key, setting_value, setting_type, description) VALUES
('system_language', 'en', 'string', 'System language setting (en, zh-TW)'),
('default_theme', 'modern', 'string', 'Default theme for the application'),
('chat_history_retention_days', '90', 'number', 'Number of days to retain chat history'),
('enable_user_registration', 'true', 'boolean', 'Allow new user registration'),
('max_message_length', '10000', 'number', 'Maximum length for chat messages'),
('require_user_body_info', 'true', 'boolean', 'Require users to provide body information (height, weight, lifestyle) for LLM context');

-- Insert default LLM configurations
INSERT INTO llm_configs (name, type, model, temperature, max_tokens, is_active) VALUES
('GPT-4', 'openai', 'gpt-4', 0.7, 2048, true),
('Llama 2', 'ollama', 'llama2', 0.8, 1024, false);