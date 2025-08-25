-- Drop existing table if needed (BE CAREFUL - this will delete all data)
-- DROP TABLE IF EXISTS instagram_webhooks CASCADE;

-- Instagram Webhooks Table with comprehensive schema
CREATE TABLE IF NOT EXISTS instagram_webhooks (
    -- Primary Key
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Webhook metadata
    webhook_type TEXT NOT NULL, -- 'message', 'reaction', 'postback', 'referral', 'read', 'ephemeral'
    raw_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    processed BOOLEAN DEFAULT FALSE,
    
    -- Entry level fields
    entry_id TEXT,
    entry_time BIGINT,
    
    -- Messaging level fields
    sender_id TEXT,
    recipient_id TEXT,
    message_timestamp BIGINT,
    
    -- Message fields
    message_id TEXT,
    message_text TEXT,
    is_deleted BOOLEAN DEFAULT FALSE,
    is_echo BOOLEAN DEFAULT FALSE,
    is_unsupported BOOLEAN DEFAULT FALSE,
    
    -- Attachment information
    attachments JSONB, -- Array of {type, url}
    attachment_types TEXT[], -- Array of attachment types for easy filtering
    
    -- Reply information
    reply_to_message_id TEXT,
    reply_to_story_id TEXT,
    reply_to_story_url TEXT,
    
    -- Quick Reply
    quick_reply_payload TEXT,
    
    -- Reaction fields
    reaction_action TEXT, -- 'react' or 'unreact'
    reaction_type TEXT, -- 'love', etc
    reaction_emoji TEXT,
    reaction_target_mid TEXT, -- The message ID being reacted to
    
    -- Postback fields
    postback_title TEXT,
    postback_payload TEXT,
    postback_mid TEXT,
    
    -- Referral fields
    referral_ref TEXT,
    referral_source TEXT, -- 'ADS', 'IGME-SOURCE-LINK', etc
    referral_type TEXT, -- 'OPEN_THREAD'
    referral_product_id TEXT,
    referral_ad_id TEXT,
    referral_ads_context JSONB, -- Contains ad_title, photo_url, video_url
    
    -- Read receipt
    read_message_id TEXT
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_webhooks_sender_id ON instagram_webhooks(sender_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_recipient_id ON instagram_webhooks(recipient_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_message_timestamp ON instagram_webhooks(message_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_webhooks_webhook_type ON instagram_webhooks(webhook_type);
CREATE INDEX IF NOT EXISTS idx_webhooks_created_at ON instagram_webhooks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhooks_processed ON instagram_webhooks(processed);
CREATE INDEX IF NOT EXISTS idx_webhooks_message_id ON instagram_webhooks(message_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_entry_id ON instagram_webhooks(entry_id);

-- GIN indexes for JSONB and array fields
CREATE INDEX IF NOT EXISTS idx_webhooks_raw_data ON instagram_webhooks USING GIN (raw_data);
CREATE INDEX IF NOT EXISTS idx_webhooks_attachments ON instagram_webhooks USING GIN (attachments);
CREATE INDEX IF NOT EXISTS idx_webhooks_attachment_types ON instagram_webhooks USING GIN (attachment_types);

-- Text search index
CREATE INDEX IF NOT EXISTS idx_webhooks_message_text ON instagram_webhooks USING GIN (to_tsvector('simple', COALESCE(message_text, '')));

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_webhooks_conversation ON instagram_webhooks(sender_id, recipient_id, message_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_webhooks_unprocessed ON instagram_webhooks(processed, created_at) WHERE processed = FALSE;

-- Enable Row Level Security
ALTER TABLE instagram_webhooks ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows INSERT from anonymous users (for webhook endpoint)
CREATE POLICY "Allow anonymous insert" ON instagram_webhooks
    FOR INSERT
    WITH CHECK (true);

-- Create a policy that allows SELECT for authenticated users only (for dashboard)
CREATE POLICY "Allow authenticated select" ON instagram_webhooks
    FOR SELECT
    USING (true);

-- Create a policy that allows UPDATE for authenticated users only (for marking as processed)
CREATE POLICY "Allow authenticated update" ON instagram_webhooks
    FOR UPDATE
    USING (true);

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE instagram_webhooks;

-- Create a view for easier querying of messages
CREATE OR REPLACE VIEW instagram_messages AS
SELECT 
    id,
    webhook_type,
    sender_id,
    recipient_id,
    message_id,
    message_text,
    message_timestamp,
    attachments,
    attachment_types,
    is_deleted,
    is_echo,
    is_unsupported,
    reply_to_message_id,
    reply_to_story_id,
    quick_reply_payload,
    created_at,
    processed
FROM instagram_webhooks
WHERE webhook_type IN ('message', 'ephemeral')
ORDER BY message_timestamp DESC;

-- Create a view for reactions
CREATE OR REPLACE VIEW instagram_reactions AS
SELECT 
    id,
    sender_id,
    recipient_id,
    reaction_action,
    reaction_type,
    reaction_emoji,
    reaction_target_mid,
    message_timestamp,
    created_at
FROM instagram_webhooks
WHERE webhook_type = 'reaction'
ORDER BY message_timestamp DESC;

-- Create a view for conversation threads
CREATE OR REPLACE VIEW instagram_conversations AS
SELECT DISTINCT ON (conversation_id)
    CASE 
        WHEN sender_id < recipient_id THEN sender_id || '-' || recipient_id
        ELSE recipient_id || '-' || sender_id
    END AS conversation_id,
    sender_id,
    recipient_id,
    message_text AS last_message,
    message_timestamp AS last_message_time,
    webhook_type AS last_activity_type,
    created_at AS last_activity_at
FROM instagram_webhooks
WHERE sender_id IS NOT NULL AND recipient_id IS NOT NULL
ORDER BY conversation_id, message_timestamp DESC;