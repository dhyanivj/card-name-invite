import { Router } from 'express';
import { supabase } from '../index';
import PDFDocument from 'pdfkit';
import fetch from 'node-fetch';

const router = Router();

// Create Guest & Generate Invitation PDF
router.post('/send', async (req, res) => {
    try {
        const { user_id, template_id, guest_name, guest_phone } = req.body;

        // 1. Fetch the template
        const { data: template, error: templateError } = await supabase
            .from('templates')
            .select('*')
            .eq('id', template_id)
            .single();

        if (templateError || !template) {
            return res.status(404).json({ error: 'Template not found' });
        }

        // 2. Create Guest
        const { data: guest, error: guestError } = await supabase
            .from('guests')
            .insert({ user_id, name: guest_name, phone: guest_phone || '0000000000' })
            .select()
            .single();

        if (guestError) throw guestError;

        // 3. Create Invitation Record (pending)
        const { data: invitation, error: inviteError } = await supabase
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
            const { error: uploadError } = await supabase.storage
                .from('assets')
                .upload(pdfPath, pdfBuffer, {
                    contentType: 'application/pdf',
                    upsert: true,
                });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('assets')
                .getPublicUrl(pdfPath);

            // 6. Update invitation with PDF URL
            await supabase
                .from('invitations')
                .update({ status: 'completed', pdf_url: publicUrl })
                .eq('id', invitation.id);

            res.json({
                message: 'Invitation created',
                invitation: { ...invitation, status: 'completed', pdf_url: publicUrl }
            });
        } catch (pdfError: any) {
            console.error('PDF generation error:', pdfError);
            await supabase
                .from('invitations')
                .update({ status: 'failed', error_message: pdfError.message })
                .eq('id', invitation.id);

            res.json({
                message: 'Invitation created but PDF generation failed',
                invitation: { ...invitation, status: 'failed' },
                error: pdfError.message
            });
        }
    } catch (error: any) {
        console.error('Invitation error:', error);
        res.status(500).json({ error: error.message });
    }
});

async function generatePDF(template: any, guestName: string): Promise<Buffer> {
    // Download the template image
    const imageUrl = template.front_image_url;
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
        throw new Error(`Failed to download template image: ${imageResponse.status}`);
    }
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

    // Determine image type from URL
    const isJpg = imageUrl.toLowerCase().match(/\.(jpg|jpeg)/) !== null;
    const isPng = imageUrl.toLowerCase().match(/\.png/) !== null;

    // Create PDF
    return new Promise<Buffer>((resolve, reject) => {
        try {
            // Use A4-ish portrait dimensions (in points: 1pt = 1/72 inch)
            const pageWidth = 500;
            const pageHeight = 700;

            const doc = new PDFDocument({
                size: [pageWidth, pageHeight],
                margin: 0,
            });

            const chunks: Buffer[] = [];
            doc.on('data', (chunk: Buffer) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            // Draw background image
            try {
                doc.image(imageBuffer, 0, 0, {
                    width: pageWidth,
                    height: pageHeight,
                });
            } catch (imgErr) {
                console.error('Image embed error, using plain background:', imgErr);
                doc.rect(0, 0, pageWidth, pageHeight).fill('#f5f5f5');
            }

            // Overlay text placeholders from config
            const config = template.config;
            const placeholders = config?.placeholders || [];

            if (placeholders.length > 0) {
                for (const placeholder of placeholders) {
                    const text = guestName;
                    const x = placeholder.left || 150;
                    const y = placeholder.top || 300;
                    const fontSize = placeholder.fontSize || 30;
                    const fontFamily = placeholder.fontFamily || 'Helvetica';
                    const fill = placeholder.fill || '#000000';

                    const pdfFont = mapToPDFFont(fontFamily);

                    // PDFKit internally adds the font ascender to the y position,
                    // which shifts text down. Compensate by subtracting ~20% of fontSize
                    // (typical ascender ratio for built-in fonts).
                    doc.font(pdfFont).fontSize(fontSize);
                    const ascenderOffset = ((doc as any)._font.ascender / 1000) * fontSize;
                    const adjustedY = y - ascenderOffset;

                    doc.fillColor(fill)
                        .text(text, x, adjustedY, {
                            lineBreak: false,
                        });
                }
            } else {
                // Fallback: place guest name in center
                doc.font('Helvetica-Bold')
                    .fontSize(36)
                    .fillColor('#000000')
                    .text(guestName, 0, pageHeight / 2, {
                        width: pageWidth,
                        align: 'center',
                    });
            }

            doc.end();
        } catch (err) {
            reject(err);
        }
    });
}

function mapToPDFFont(webFont: string): string {
    const fontMap: Record<string, string> = {
        'Arial': 'Helvetica',
        'Helvetica': 'Helvetica',
        'Times New Roman': 'Times-Roman',
        'Georgia': 'Times-Roman',
        'Courier New': 'Courier',
        'Verdana': 'Helvetica',
        'Impact': 'Helvetica-Bold',
        'Comic Sans MS': 'Helvetica',
        'cursive': 'Times-Italic',
    };
    return fontMap[webFont] || 'Helvetica';
}

// Get invitations
router.get('/', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('invitations')
            .select(`
                id,
                status,
                pdf_url,
                created_at,
                guests!inner(name, phone)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Bulk Import Guests (Placeholder)
router.post('/bulk', async (req, res) => {
    res.json({ message: 'Not implemented' });
});

export const invitationRouter = router;
