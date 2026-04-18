-- Crystal Pool Database Triggers
-- Run these in Supabase SQL Editor

-- 1. Function to recalculate pool status based on latest readings
CREATE OR REPLACE FUNCTION update_pool_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update pool status directly using JSONB extraction from NEW
  UPDATE pools SET
    status = CASE
      WHEN (NEW.values->>'ph') IS NULL AND (NEW.values->>'chlorine') IS NULL THEN 'offline'
      WHEN ((NEW.values->>'ph')::NUMERIC(4,2) < 6.8) OR ((NEW.values->>'ph')::NUMERIC(4,2) > 8.0) THEN 'critical'
      WHEN ((NEW.values->>'chlorine')::NUMERIC(4,2) < 0.5) THEN 'critical'
      WHEN ((NEW.values->>'ph')::NUMERIC(4,2) < 7.2) OR ((NEW.values->>'ph')::NUMERIC(4,2) > 7.6) THEN 'warning'
      WHEN ((NEW.values->>'chlorine')::NUMERIC(4,2) < 1.0) OR ((NEW.values->>'chlorine')::NUMERIC(4,2) > 5.0) THEN 'warning'
      ELSE 'crystal'
    END,
    updated_at = NOW(),
    last_reading_at = NEW.created_at
  WHERE id = NEW.pool_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Trigger to call function after each pool_logs insert
DROP TRIGGER IF EXISTS on_pool_logs_status_update ON pool_logs;
CREATE TRIGGER on_pool_logs_status_update
  AFTER INSERT ON pool_logs
  FOR EACH ROW
  WHEN (NEW.type = 'reading')
  EXECUTE FUNCTION update_pool_status();