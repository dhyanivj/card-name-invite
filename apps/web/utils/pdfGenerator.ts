import PDFDocument from 'pdfkit';

export async function generatePDF(template: any, guestName: string): Promise<Buffer> {
    const config = template.config || {};
    let pageUrls: string[] = [];

    if (config.pages && Array.isArray(config.pages) && config.pages.length > 0) {
        pageUrls = config.pages;
    } else if (template.front_image_url) {
        pageUrls = [template.front_image_url];
    } else {
        throw new Error('No template images found');
    }

    // Download all images concurrently
    const imageBuffers: Buffer[] = await Promise.all(
        pageUrls.map(async (url) => {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to download template image: ${response.status}`);
            }
            return Buffer.from(await response.arrayBuffer());
        })
    );

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

            for (let i = 0; i < imageBuffers.length; i++) {
                if (i > 0) {
                    doc.addPage({ size: [pageWidth, pageHeight], margin: 0 });
                }

                // Draw background image
                try {
                    doc.image(imageBuffers[i], 0, 0, {
                        width: pageWidth,
                        height: pageHeight,
                    });
                } catch (imgErr) {
                    console.error(`Image embed error on page ${i}, using plain background:`, imgErr);
                    doc.rect(0, 0, pageWidth, pageHeight).fill('#f5f5f5');
                }

                // Overlay text placeholders from config ONLY on the first page
                if (i === 0) {
                    const placeholders = config.placeholders || [];

                    if (placeholders.length > 0) {
                        for (const placeholder of placeholders) {
                            const text = guestName;
                            const x = placeholder.left || 150;
                            const y = placeholder.top || 300;
                            const fontSize = placeholder.fontSize || 30;
                            const fontFamily = placeholder.fontFamily || 'Helvetica';
                            const fill = placeholder.fill || '#000000';

                            const pdfFont = mapToPDFFont(fontFamily);

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
                }
            }

            doc.end();
        } catch (err) {
            reject(err);
        }
    });
}

export function mapToPDFFont(webFont: string): string {
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
