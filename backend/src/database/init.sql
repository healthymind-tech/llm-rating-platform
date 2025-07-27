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

-- Insert default admin user (password: 'password')
INSERT INTO users (username, email, password_hash, role) VALUES 
('admin', 'admin@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin');

-- Insert default user (password: 'password')
INSERT INTO users (username, email, password_hash, role) VALUES 
('user', 'user@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user');

-- Insert default LLM configurations
INSERT INTO llm_configs (name, type, model, temperature, max_tokens, is_active) VALUES
('GPT-4', 'openai', 'gpt-4', 0.7, 2048, true),
('Llama 2', 'ollama', 'llama2', 0.8, 1024, false);