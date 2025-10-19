-- Function to update loan amount_funded when investments are made
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update amount_funded after investment insert
CREATE TRIGGER update_loan_funded_after_investment
AFTER INSERT ON investments
FOR EACH ROW
EXECUTE FUNCTION update_loan_funded_amount();