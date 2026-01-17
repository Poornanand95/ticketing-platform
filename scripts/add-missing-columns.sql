-- Add missing columns to fix login issue
-- Run this script against your PostgreSQL database

-- Add skills column to users table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'skills'
    ) THEN
        ALTER TABLE users ADD COLUMN skills JSONB DEFAULT '[]'::jsonb;
        RAISE NOTICE 'Added skills column to users table';
    ELSE
        RAISE NOTICE 'skills column already exists in users table';
    END IF;
END $$;

-- Add is_active column to users table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'is_active'
    ) THEN
        ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT true NOT NULL;
        RAISE NOTICE 'Added is_active column to users table';
    ELSE
        RAISE NOTICE 'is_active column already exists in users table';
    END IF;
END $$;

-- Add required_skill column to tickets table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tickets' AND column_name = 'required_skill'
    ) THEN
        ALTER TABLE tickets ADD COLUMN required_skill TEXT;
        RAISE NOTICE 'Added required_skill column to tickets table';
    ELSE
        RAISE NOTICE 'required_skill column already exists in tickets table';
    END IF;
END $$;

-- Update existing users to have empty skills array if null
UPDATE users SET skills = '[]'::jsonb WHERE skills IS NULL;

-- Update existing users to be active if is_active is null
UPDATE users SET is_active = true WHERE is_active IS NULL;

-- Add custom_fields column to tickets table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tickets' AND column_name = 'custom_fields'
    ) THEN
        ALTER TABLE tickets ADD COLUMN custom_fields JSONB DEFAULT '{}'::jsonb;
        RAISE NOTICE 'Added custom_fields column to tickets table';
    ELSE
        RAISE NOTICE 'custom_fields column already exists in tickets table';
    END IF;
END $$;

-- Add custom_fields column to buckets table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'buckets' AND column_name = 'custom_fields'
    ) THEN
        ALTER TABLE buckets ADD COLUMN custom_fields JSONB DEFAULT '[]'::jsonb;
        RAISE NOTICE 'Added custom_fields column to buckets table';
    ELSE
        RAISE NOTICE 'custom_fields column already exists in buckets table';
    END IF;
END $$;

-- Update existing tickets to have empty custom_fields object if null
UPDATE tickets SET custom_fields = '{}'::jsonb WHERE custom_fields IS NULL;

-- Update existing buckets to have empty custom_fields array if null
UPDATE buckets SET custom_fields = '[]'::jsonb WHERE custom_fields IS NULL;




