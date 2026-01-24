/**
 * Activity Log Migration
 * Creates activity_logs table for tracking login/logout and user management events.
 */

const createActivityLogSchema = `
-- Activity Logs table
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    details JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster user-based queries
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);

-- Index for faster action-based queries
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);

-- Index for time-based queries (most recent first)
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
`;

module.exports = { createActivityLogSchema };
