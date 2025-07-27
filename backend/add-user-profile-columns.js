const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'llm_testing_platform',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

async function addUserProfileColumns() {
  try {
    console.log('Adding user profile columns to users table...');
    
    // Add new columns to users table
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS height DECIMAL(5,2),
      ADD COLUMN IF NOT EXISTS weight DECIMAL(5,2),
      ADD COLUMN IF NOT EXISTS body_fat DECIMAL(5,2),
      ADD COLUMN IF NOT EXISTS lifestyle_habits TEXT,
      ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT false;
    `);
    
    console.log('✅ User profile columns added successfully');
    
    // Create or replace the profile completion function
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_profile_completed()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.profile_completed = (
          NEW.height IS NOT NULL AND 
          NEW.weight IS NOT NULL AND 
          NEW.lifestyle_habits IS NOT NULL AND 
          NEW.lifestyle_habits != ''
        );
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);
    
    console.log('✅ Profile completion function created');
    
    // Create trigger for profile completion (drop if exists first)
    await pool.query(`
      DROP TRIGGER IF EXISTS update_users_profile_completed ON users;
    `);
    
    await pool.query(`
      CREATE TRIGGER update_users_profile_completed 
        BEFORE UPDATE ON users 
        FOR EACH ROW EXECUTE FUNCTION update_profile_completed();
    `);
    
    console.log('✅ Profile completion trigger created');
    
    console.log('🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

addUserProfileColumns();