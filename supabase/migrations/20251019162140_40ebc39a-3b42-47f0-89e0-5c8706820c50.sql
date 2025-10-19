-- Fix security issue: Set search_path for the function
CREATE OR REPLACE FUNCTION update_loan_funded_amount()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the loan_requests amount_funded by summing all investments
  UPDATE loan_requests
  SET amount_funded = (
    SELECT COALESCE(SUM(amount), 0)
    FROM investments
    WHERE loan_id = NEW.loan_id
  )
  WHERE id = NEW.loan_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;