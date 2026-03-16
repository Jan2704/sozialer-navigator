-- Create Paid Applications Tracking Table
CREATE TABLE IF NOT EXISTS public.paid_applications (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT now(),
    stripe_session_id text UNIQUE NOT NULL,
    customer_name text,
    customer_email text NOT NULL,
    authority_name text,
    benefit_label text,
    status text NOT NULL DEFAULT 'PENDING',
    error_log text,
    pdf_generated_at timestamp with time zone,
    completed_at timestamp with time zone
);

-- Row Level Security (RLS) setup 
ALTER TABLE public.paid_applications ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (Backend Node.js API uses service role/anon with server key)
CREATE POLICY "Allow service role full access" ON public.paid_applications
    FOR ALL
    TO service_role
    USING (true);

-- Allow anonymous inserts (Since the Webhook uses Anon key currently in some setups)
CREATE POLICY "Allow anonymous inserts" ON public.paid_applications
    FOR INSERT 
    TO anon
    WITH CHECK (true);

-- Allow anonymous updates (Since Webhook updates the status)
CREATE POLICY "Allow anonymous updates" ON public.paid_applications
    FOR UPDATE 
    TO anon
    USING (true)
    WITH CHECK (true);
