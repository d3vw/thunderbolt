-- Add isConfidential field to models table
ALTER TABLE models ADD COLUMN is_confidential INTEGER NOT NULL DEFAULT 0;

-- Add isEncrypted field to chat_threads table  
ALTER TABLE chat_threads ADD COLUMN is_encrypted INTEGER NOT NULL DEFAULT 0;