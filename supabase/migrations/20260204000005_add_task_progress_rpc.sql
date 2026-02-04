-- Create RPC function to increment task progress atomically
CREATE OR REPLACE FUNCTION increment_task_progress(
  p_user_id UUID,
  p_task_id TEXT,
  p_date DATE,
  p_increment DECIMAL,
  p_target DECIMAL
) RETURNS VOID AS $$
DECLARE
  v_current_progress DECIMAL;
  v_new_progress DECIMAL;
  v_completed BOOLEAN;
BEGIN
  -- Insert or get current progress
  INSERT INTO tasks_progress (user_id, task_id, date, progress, target, completed, claimed)
  VALUES (p_user_id, p_task_id, p_date, 0, p_target, false, false)
  ON CONFLICT (user_id, task_id, date) DO NOTHING;

  -- Get current progress
  SELECT progress INTO v_current_progress
  FROM tasks_progress
  WHERE user_id = p_user_id 
    AND task_id = p_task_id 
    AND date = p_date
  FOR UPDATE;

  -- Calculate new progress
  v_new_progress := v_current_progress + p_increment;
  v_completed := v_new_progress >= p_target;

  -- Update progress
  UPDATE tasks_progress
  SET 
    progress = v_new_progress,
    completed = v_completed,
    updated_at = now()
  WHERE user_id = p_user_id 
    AND task_id = p_task_id 
    AND date = p_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
