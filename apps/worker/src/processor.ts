import { createClient } from '@supabase/supabase-js';
import { PDFDocument } from 'pdf-lib';
import { fabric } from 'fabric';
import axios from 'axios';

// Initialize Supabase
const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

interface JobData {
    invitationId: string;
    templateId: string;
    guestName: string;
}

export async function processInvitation(data: JobData) {
    try {
        const { invitationId, templateId, guestName } = data;

        // 1. Fetch Template Data
        const { data: template, error } = await supabase
            .from('templates')
            .select('*')
            .eq('id', templateId)
            .single();

        if (error) throw new Error(`Template not found: ${error.message}`);

        await updateStatus(invitationId, 'processing');

        // 2. Generate PDF
        const pdfUrl = await generatePDF(template, guestName);

        // 3. Update Invitation with PDF URL & Completed Status
        await updateStatus(invitationId, 'completed', pdfUrl);
        console.log(`PDF Generated for ${guestName}: ${pdfUrl}`);

    } catch (err: any) {
        console.error('Error processing invitation:', err);
        await updateStatus(data.invitationId, 'failed', undefined, err.message);
    }
}

async function generatePDF(template: any, guestName: string): Promise<string> {
    // Placeholder implementation for brevity
    // Simulating PDF generation delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // In a real implementation:
    // 1. Load template.front_image_url into Fabric
    // 2. Add guestName using config
    // 3. Render to Buffer
    // 4. Create proper PDF

    // For now, return a placeholder PDF
    const dummyPdfUrl = `https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf`;
    return dummyPdfUrl;
}

async function updateStatus(id: string, status: string, pdfUrl?: string, errorMsg?: string) {
    const updateData: any = { status };
    if (pdfUrl) updateData.pdf_url = pdfUrl;
    if (errorMsg) updateData.error_message = errorMsg;

    await supabase
        .from('invitations')
        .update(updateData)
        .eq('id', id);
}
