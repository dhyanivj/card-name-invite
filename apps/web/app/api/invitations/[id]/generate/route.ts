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

        try {
            const pdfBuffer = await generatePDF(template, guestName);

            // Build a clean filename: TemplateName_GuestName.pdf
            const safeName = `${template.name}_${guestName}`
                .replace(/[^a-zA-Z0-9_\-\u0900-\u097F ]/g, '')
                .replace(/\s+/g, '_');

            // Update status to completed (no pdf_url since it's a direct download)
            await supabaseAdmin
                .from('invitations')
                .update({ status: 'completed' })
                .eq('id', invitation.id);

            // Return PDF as a downloadable response
            return new Response(pdfBuffer, {
                headers: {
                    'Content-Type': 'application/pdf',
                    'Content-Disposition': `attachment; filename="${safeName}.pdf"`,
                    'Content-Length': pdfBuffer.length.toString(),
                },
            });
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
