import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../utils/supabaseAdmin';
import { generatePDF } from '../../../../../utils/pdfGenerator';

export async function POST(req: Request, { params }: { params: { id: string } }) {
    try {
        const { id } = params;

        // Fetch invitation
        const { data: invitation, error: inviteError } = await supabaseAdmin
            .from('invitations')
            .select('*, guests (name, user_id)')
            .eq('id', id)
            .single();

        if (inviteError || !invitation) {
            return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
        }

        // Update status to processing
        await supabaseAdmin.from('invitations').update({ status: 'processing' }).eq('id', id);

        // Fetch template
        const { data: template, error: templateError } = await supabaseAdmin
            .from('templates')
            .select('*')
            .eq('id', invitation.template_id)
            .single();

        if (templateError || !template) {
            return NextResponse.json({ error: 'Template not found' }, { status: 404 });
        }

        const guestData = Array.isArray(invitation.guests) ? invitation.guests[0] : invitation.guests;
        const guestName = guestData?.name || '';
        const userId = guestData?.user_id || 'unknown';

        try {
            const pdfBuffer = await generatePDF(template, guestName);
            const pdfPath = `pdfs/${userId}/${invitation.id}.pdf`;

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

            await supabaseAdmin
                .from('invitations')
                .update({ status: 'completed', pdf_url: publicUrl })
                .eq('id', invitation.id);

            return NextResponse.json({ message: 'Generated successfully', url: publicUrl });
        } catch (pdfError: any) {
            await supabaseAdmin
                .from('invitations')
                .update({ status: 'failed', error_message: pdfError.message })
                .eq('id', invitation.id);
            return NextResponse.json({ error: pdfError.message }, { status: 500 });
        }
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
