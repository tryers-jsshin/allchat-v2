-- Instagram Webhooks Table
CREATE TABLE IF NOT EXISTS instagram_webhooks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    webhook_type TEXT NOT NULL,
    raw_data JSONB NOT NULL,
    sender_id TEXT,
    recipient_id TEXT,
    message_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    processed BOOLEAN DEFAULT FALSE
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_instagram_webhooks_sender_id ON instagram_webhooks(sender_id);
CREATE INDEX IF NOT EXISTS idx_instagram_webhooks_message_id ON instagram_webhooks(message_id);
CREATE INDEX IF NOT EXISTS idx_instagram_webhooks_created_at ON instagram_webhooks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_instagram_webhooks_processed ON instagram_webhooks(processed);

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

-- Optional: Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE instagram_webhooks;