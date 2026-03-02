import { createClient } from '@supabase/supabase-js';

// Initialize Supabase with the Service Role key to bypass RLS in the background tasks
export const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
    process.env.SUPABASE_SERVICE_KEY || 'dummy_key_to_pass_build'
);
