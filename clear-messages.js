const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'llm_testing_platform',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function clearAllMessages() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Clear message ratings first (due to foreign key constraints)
    const messageRatingsResult = await client.query('DELETE FROM message_ratings');
    console.log(`Deleted ${messageRatingsResult.rowCount} message ratings`);
    
    // Clear session ratings
    const sessionRatingsResult = await client.query('DELETE FROM session_ratings');
    console.log(`Deleted ${sessionRatingsResult.rowCount} session ratings`);
    
    // Clear chat messages
    const messagesResult = await client.query('DELETE FROM chat_messages');
    console.log(`Deleted ${messagesResult.rowCount} chat messages`);
    
    // Clear chat sessions
    const sessionsResult = await client.query('DELETE FROM chat_sessions');
    console.log(`Deleted ${sessionsResult.rowCount} chat sessions`);
    
    await client.query('COMMIT');
    console.log('All messages and related data cleared successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error clearing messages:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

clearAllMessages()
  .then(() => {
    console.log('Database cleanup completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Database cleanup failed:', error);
    process.exit(1);
  });