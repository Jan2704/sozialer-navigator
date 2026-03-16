-- Create WBA Reminders Table
CREATE TABLE IF NOT EXISTS public.wba_reminders (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT now(),
    name text,
    email text NOT NULL,
    bescheid_end_date date NOT NULL,
    reminder_date_1 date NOT NULL,
    reminder_date_2 date NOT NULL,
    reminder_1_sent boolean DEFAULT false,
    reminder_2_sent boolean DEFAULT false
);

-- Row Level Security (RLS) setup 
-- Enable RLS
ALTER TABLE public.wba_reminders ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (from the frontend API using the Anon Key)
CREATE POLICY "Allow anonymous inserts" ON public.wba_reminders
    FOR INSERT 
    TO anon
    WITH CHECK (true);

-- Allow service role full access (for the Cron Job)
CREATE POLICY "Allow service role full access" ON public.wba_reminders
    FOR ALL
    TO service_role
    USING (true);
