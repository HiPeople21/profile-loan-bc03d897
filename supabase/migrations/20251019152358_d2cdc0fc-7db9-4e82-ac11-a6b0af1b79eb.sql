-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User roles enum
CREATE TYPE public.app_role AS ENUM ('borrower', 'investor', 'admin');

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Borrower profiles
CREATE TABLE public.borrower_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  bio TEXT,
  purpose TEXT,
  credit_score INTEGER CHECK (credit_score >= 300 AND credit_score <= 850),
  is_verified BOOLEAN DEFAULT false,
  verification_date TIMESTAMPTZ,
  total_borrowed DECIMAL(12,2) DEFAULT 0,
  total_repaid DECIMAL(12,2) DEFAULT 0,
  defaults_count INTEGER DEFAULT 0,
  successful_loans_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.borrower_profiles ENABLE ROW LEVEL SECURITY;

-- Loan requests
CREATE TABLE public.loan_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  borrower_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  amount_requested DECIMAL(12,2) NOT NULL CHECK (amount_requested > 0),
  amount_funded DECIMAL(12,2) DEFAULT 0 CHECK (amount_funded >= 0),
  interest_rate DECIMAL(5,2) NOT NULL CHECK (interest_rate >= 0 AND interest_rate <= 100),
  repayment_months INTEGER NOT NULL CHECK (repayment_months > 0 AND repayment_months <= 60),
  currency TEXT DEFAULT 'USD' NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'funded', 'active', 'completed', 'defaulted')),
  funded_at TIMESTAMPTZ,
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.loan_requests ENABLE ROW LEVEL SECURITY;

-- Investments
CREATE TABLE public.investments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  loan_id UUID REFERENCES public.loan_requests(id) ON DELETE CASCADE NOT NULL,
  investor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;

-- Repayments tracking
CREATE TABLE public.repayments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  loan_id UUID REFERENCES public.loan_requests(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  payment_date TIMESTAMPTZ DEFAULT now() NOT NULL,
  is_on_time BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.repayments ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Profiles: users can view all profiles, but only update their own
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Borrower profiles: public read, owner write
CREATE POLICY "Anyone can view borrower profiles"
  ON public.borrower_profiles FOR SELECT
  USING (true);

CREATE POLICY "Borrowers can update own profile"
  ON public.borrower_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Borrowers can insert own profile"
  ON public.borrower_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Loan requests: public read, borrower write
CREATE POLICY "Anyone can view loan requests"
  ON public.loan_requests FOR SELECT
  USING (true);

CREATE POLICY "Borrowers can create loan requests"
  ON public.loan_requests FOR INSERT
  WITH CHECK (auth.uid() = borrower_id);

CREATE POLICY "Borrowers can update own loan requests"
  ON public.loan_requests FOR UPDATE
  USING (auth.uid() = borrower_id);

-- Investments: public read (for transparency), investor write
CREATE POLICY "Anyone can view investments"
  ON public.investments FOR SELECT
  USING (true);

CREATE POLICY "Investors can create investments"
  ON public.investments FOR INSERT
  WITH CHECK (auth.uid() = investor_id);

-- Repayments: public read, borrowers write
CREATE POLICY "Anyone can view repayments"
  ON public.repayments FOR SELECT
  USING (true);

CREATE POLICY "Loan owner can create repayments"
  ON public.repayments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.loan_requests
      WHERE id = loan_id AND borrower_id = auth.uid()
    )
  );

-- User roles policies
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for profile creation on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', '')
  );
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update timestamps trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_borrower_profiles_updated_at
  BEFORE UPDATE ON public.borrower_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_loan_requests_updated_at
  BEFORE UPDATE ON public.loan_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();