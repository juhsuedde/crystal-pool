-- Crystal Pool Database Triggers
-- Run these in Supabase SQL Editor

-- 1. Function to recalculate pool status based on latest readings
CREATE OR REPLACE FUNCTION update_pool_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update status directly using subquery
  UPDATE pools p SET
    status = CASE
      WHEN (SELECT ph FROM pool_logs WHERE pool_id = NEW.pool_id AND type = 'reading' ORDER BY created_at DESC LIMIT 1) IS NULL 
           AND (SELECT chlorine FROM pool_logs WHERE pool_id = NEW.pool_id AND type = 'reading' ORDER BY created_at DESC LIMIT 1) IS NULL 
      THEN 'offline'
      WHEN (SELECT ph FROM pool_logs WHERE pool_id = NEW.pool_id AND type = 'reading' ORDER BY created_at DESC LIMIT 1) < 6.8 
           OR (SELECT ph FROM pool_logs WHERE pool_id = NEW.pool_id AND type = 'reading' ORDER BY created_at DESC LIMIT 1) > 8.0 
      THEN 'critical'
      WHEN (SELECT chlorine FROM pool_logs WHERE pool_id = NEW.pool_id AND type = 'reading' ORDER BY created_at DESC LIMIT 1) < 0.5 
      THEN 'critical'
      WHEN (SELECT ph FROM pool_logs WHERE pool_id = NEW.pool_id AND type = 'reading' ORDER BY created_at DESC LIMIT 1) < 7.2 
           OR (SELECT ph FROM pool_logs WHERE pool_id = NEW.pool_id AND type = 'reading' ORDER BY created_at DESC LIMIT 1) > 7.6 
      THEN 'warning'
      WHEN (SELECT chlorine FROM pool_logs WHERE pool_id = NEW.pool_id AND type = 'reading' ORDER BY created_at DESC LIMIT 1) < 1.0 
           OR (SELECT chlorine FROM pool_logs WHERE pool_id = NEW.pool_id AND type = 'reading' ORDER BY created_at DESC LIMIT 1) > 5.0 
      THEN 'warning'
      ELSE 'crystal'
    END,
    updated_at = NOW(),
    last_reading_at = NEW.created_at
  WHERE p.id = NEW.pool_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Trigger to call function after each pool_logs insert
DROP TRIGGER IF EXISTS on_pool_logs_status_update ON pool_logs;
CREATE TRIGGER on_pool_logs_status_update
  AFTER INSERT ON pool_logs
  FOR EACH ROW
  WHEN (NEW.type = 'reading')
  EXECUTE FUNCTION update_pool_status();