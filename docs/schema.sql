-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (Managed by Supabase Auth usually, but here for reference/extension)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  email TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Templates Table
CREATE TABLE public.templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) NOT NULL,
  name TEXT NOT NULL,
  front_image_url TEXT NOT NULL,
  inside_image_url TEXT,
  back_image_url TEXT,
  config JSONB NOT NULL DEFAULT '{}'::jsonb, -- Stores text position, font, color, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Guests Table
CREATE TABLE public.guests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Invitations Table
CREATE TYPE invitation_status AS ENUM ('pending', 'processing', 'sent', 'failed');

CREATE TABLE public.invitations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  guest_id UUID REFERENCES public.guests(id) ON DELETE CASCADE NOT NULL,
  template_id UUID REFERENCES public.templates(id) ON DELETE SET NULL,
  status invitation_status DEFAULT 'pending',
  pdf_url TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Send Logs Table
CREATE TABLE public.send_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  invitation_id UUID REFERENCES public.invitations(id) ON DELETE CASCADE NOT NULL,
  status invitation_status NOT NULL,
  response_payload JSONB, -- Store WhatsApp API response
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Policies (Row Level Security)
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.send_logs ENABLE ROW LEVEL SECURITY;

-- Policies for Templates
CREATE POLICY "Users can view their own templates" ON public.templates
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own templates" ON public.templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates" ON public.templates
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates" ON public.templates
  FOR DELETE USING (auth.uid() = user_id);

-- Policies for Guests
CREATE POLICY "Users can view their own guests" ON public.guests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own guests" ON public.guests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own guests" ON public.guests
  FOR DELETE USING (auth.uid() = user_id);

-- Policies for Invitations
CREATE POLICY "Users can view their own invitations" ON public.invitations
  FOR SELECT USING (
    guest_id IN (SELECT id FROM public.guests WHERE user_id = auth.uid())
  );

-- Function to handle UpdatedAt
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_invitations_updated_at BEFORE UPDATE
ON public.invitations FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
