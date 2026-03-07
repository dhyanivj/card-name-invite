import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

function hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
        return {
            r: parseInt(result[1], 16) / 255,
            g: parseInt(result[2], 16) / 255,
            b: parseInt(result[3], 16) / 255,
        };
    }
    return { r: 0, g: 0, b: 0 };
}

async function getStandardFont(pdfDoc: PDFDocument, fontFamily: string) {
    const fontMap: Record<string, string> = {
        'Arial': 'Helvetica',
        'Helvetica': 'Helvetica',
        'Helvetica-Bold': 'HelveticaBold',
        'Times New Roman': 'TimesRoman',
        'Times-Roman': 'TimesRoman',
        'Georgia': 'TimesRoman',
        'Courier New': 'Courier',
        'Courier': 'Courier',
        'Verdana': 'Helvetica',
        'Impact': 'HelveticaBold',
        'Comic Sans MS': 'Helvetica',
        'cursive': 'TimesRomanItalic',
        'Times-Italic': 'TimesRomanItalic',
    };

    const fontKey = fontMap[fontFamily] || 'Helvetica';

    const standardFontMap: Record<string, typeof StandardFonts[keyof typeof StandardFonts]> = {
        'Helvetica': StandardFonts.Helvetica,
        'HelveticaBold': StandardFonts.HelveticaBold,
        'TimesRoman': StandardFonts.TimesRoman,
        'TimesRomanItalic': StandardFonts.TimesRomanItalic,
        'Courier': StandardFonts.Courier,
    };

    return pdfDoc.embedFont(standardFontMap[fontKey] || StandardFonts.Helvetica);
}

async function detectImageType(buffer: Buffer): Promise<'png' | 'jpg'> {
    // Check PNG magic bytes
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
        return 'png';
    }
    // Default to jpg
    return 'jpg';
}

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

    const pageWidth = 500;
    const pageHeight = 700;

    const pdfDoc = await PDFDocument.create();

    for (let i = 0; i < imageBuffers.length; i++) {
        const page = pdfDoc.addPage([pageWidth, pageHeight]);

        // Embed and draw background image
        try {
            const imgType = await detectImageType(imageBuffers[i]);
            let embeddedImage;

            if (imgType === 'png') {
                embeddedImage = await pdfDoc.embedPng(imageBuffers[i]);
            } else {
                embeddedImage = await pdfDoc.embedJpg(imageBuffers[i]);
            }

            page.drawImage(embeddedImage, {
                x: 0,
                y: 0,
                width: pageWidth,
                height: pageHeight,
            });
        } catch (imgErr) {
            console.error(`Image embed error on page ${i}, using plain background:`, imgErr);
            page.drawRectangle({
                x: 0,
                y: 0,
                width: pageWidth,
                height: pageHeight,
                color: rgb(0.96, 0.96, 0.96),
            });
        }

        // Overlay text placeholders ONLY on the first page
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

                    const font = await getStandardFont(pdfDoc, fontFamily);
                    const color = hexToRgb(fill);

                    // Fabric.js 'top' = distance from canvas top to the top of text bounding box
                    // pdf-lib 'y' = distance from page bottom to the text baseline
                    // ascent = distance from baseline to top of text ≈ fontSize * 0.72 for standard fonts
                    const ascent = font.heightAtSize(fontSize, { descender: false });
                    const pdfY = pageHeight - y - ascent;

                    page.drawText(text, {
                        x: x,
                        y: pdfY,
                        size: fontSize,
                        font: font,
                        color: rgb(color.r, color.g, color.b),
                    });
                }
            } else {
                // Fallback: place guest name in center
                const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
                const textWidth = font.widthOfTextAtSize(guestName, 36);
                const centerX = (pageWidth - textWidth) / 2;
                const centerY = pageHeight / 2;

                page.drawText(guestName, {
                    x: centerX,
                    y: centerY,
                    size: 36,
                    font: font,
                    color: rgb(0, 0, 0),
                });
            }
        }
    }

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
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
