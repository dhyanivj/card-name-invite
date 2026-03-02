import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../utils/supabaseAdmin';
import { generatePDF } from '../../../../utils/pdfGenerator';

export async function POST(req: Request) {
    try {
        const { user_id, template_id, guest_name, guest_phone } = await req.json();

        // 1. Fetch the template
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

        // 3. Create Invitation Record (pending)
        const { data: invitation, error: inviteError } = await supabaseAdmin
            .from('invitations')
            .insert({
                guest_id: guest.id,
                template_id,
                status: 'processing'
            })
            .select()
            .single();

        if (inviteError) throw inviteError;

        // 4. Generate PDF
        try {
            const pdfBuffer = await generatePDF(template, guest_name);

            // 5. Upload PDF to storage
            const pdfPath = `pdfs/${user_id}/${invitation.id}.pdf`;
            const { error: uploadError } = await supabaseAdmin.storage
                .from('assets')
                .upload(pdfPath, pdfBuffer, {
                    contentType: 'application/pdf',
                    upsert: true,
                });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabaseAdmin.storage
                .from('assets')
                .getPublicUrl(pdfPath);

            // 6. Update invitation with PDF URL
            await supabaseAdmin
                .from('invitations')
                .update({ status: 'completed', pdf_url: publicUrl })
                .eq('id', invitation.id);

            return NextResponse.json({
                message: 'Invitation created',
                invitation: { ...invitation, status: 'completed', pdf_url: publicUrl }
            });
        } catch (pdfError: any) {
            console.error('PDF generation error:', pdfError);
            await supabaseAdmin
                .from('invitations')
                .update({ status: 'failed', error_message: pdfError.message })
                .eq('id', invitation.id);

            return NextResponse.json({
                message: 'Invitation created but PDF generation failed',
                invitation: { ...invitation, status: 'failed' },
                error: pdfError.message
            }, { status: 500 });
        }
    } catch (error: any) {
        console.error('Invitation error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
