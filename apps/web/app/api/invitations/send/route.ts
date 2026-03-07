import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../utils/supabaseAdmin';

export async function POST(req: Request) {
    try {
        const { user_id, template_id, guest_name, guest_phone } = await req.json();

        // 1. Fetch the template (to verify it exists)
        const { data: template, error: templateError } = await supabaseAdmin
            .from('templates')
            .select('*')
            .eq('id', template_id)
            .single();

        if (templateError || !template) {
            return NextResponse.json({ error: 'Template not found' }, { status: 404 });
        }

        // 2. Create Guest
        const { data: guest, error: guestError } = await supabaseAdmin
            .from('guests')
            .insert({ user_id, name: guest_name, phone: guest_phone || '0000000000' })
            .select()
            .single();

        if (guestError) throw guestError;

        // 3. Create Invitation Record (pending — no PDF generated yet)
        const { data: invitation, error: inviteError } = await supabaseAdmin
            .from('invitations')
            .insert({
                guest_id: guest.id,
                template_id,
                status: 'pending'
            })
            .select()
            .single();

        if (inviteError) throw inviteError;

        return NextResponse.json({
            message: 'Guest added successfully. Generate PDF when ready.',
            invitation: { ...invitation, status: 'pending' }
        });
    } catch (error: any) {
        console.error('Invitation error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
