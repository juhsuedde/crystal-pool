-- Crystal Pool Database Triggers
-- Run these in Supabase SQL Editor

-- 1. Function to recalculate pool status based on latest readings
CREATE OR REPLACE FUNCTION update_pool_status()
RETURNS TRIGGER AS $$
DECLARE
  v_ph NUMERIC(4,2);
  v_chlorine NUMERIC(4,2);
BEGIN
  -- Fetch latest readings into local variables
  SELECT ph, chlorine INTO v_ph, v_chlorine
  FROM pool_logs
  WHERE pool_id = NEW.pool_id AND type = 'reading'
  ORDER BY created_at DESC
  LIMIT 1;

  -- Update pool status using local variables
  UPDATE pools p SET
    status = CASE
      WHEN v_ph IS NULL AND v_chlorine IS NULL THEN 'offline'
      WHEN v_ph < 6.8 OR v_ph > 8.0 THEN 'critical'
      WHEN v_chlorine < 0.5 THEN 'critical'
      WHEN v_ph < 7.2 OR v_ph > 7.6 THEN 'warning'
      WHEN v_chlorine < 1.0 OR v_chlorine > 5.0 THEN 'warning'
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