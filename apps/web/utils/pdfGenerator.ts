import 'regenerator-runtime/runtime';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import sharp from 'sharp';

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

// Cache font in memory for subsequent lambda executions
let cachedDevanagariFont: ArrayBuffer | null = null;

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

    // Download all images concurrently and compress them
    const imageBuffers: Buffer[] = await Promise.all(
        pageUrls.map(async (url) => {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to download template image: ${response.status}`);
            }
            const buffer = Buffer.from(await response.arrayBuffer());

            // Compress the image before embedding (width 1000px matches 2x retina of the 500pt PDF width)
            return await sharp(buffer)
                .resize({ width: 1000, withoutEnlargement: true })
                .jpeg({ quality: 80, force: true }) // Force JPEG for high compression
                .toBuffer();
        })
    );

    const pageWidth = 500;
    const pageHeight = 700;

    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);

    const containsHindi = (str: string) => /[\u0900-\u097F]/.test(str);
    const isHindi = containsHindi(guestName);
    let devanagariFont: any = null;

    if (isHindi) {
        try {
            if (!cachedDevanagariFont) {
                const fontUrl = 'https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts@main/hinted/ttf/NotoSansDevanagari/NotoSansDevanagari-Regular.ttf';
                const fontRes = await fetch(fontUrl);
                if (!fontRes.ok) throw new Error(`Font fetch failed: ${fontRes.status}`);
                cachedDevanagariFont = await fontRes.arrayBuffer();
            }
            devanagariFont = await pdfDoc.embedFont(cachedDevanagariFont);
        } catch (fontErr: any) {
            console.error('Failed to load Devanagari font:', fontErr);
            throw new Error(`Failed to load Hindi font: ${fontErr.message || fontErr}`);
        }
    }

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

                    let font;
                    if (isHindi && devanagariFont) {
                        font = devanagariFont;
                    } else {
                        font = await getStandardFont(pdfDoc, fontFamily);
                    }
                    const color = hexToRgb(fill);

                    // Fabric.js 'top' = distance from canvas top to the top of text bounding box
                    // pdf-lib 'y' = distance from page bottom to the text baseline
                    // The baseline sits at approximately (top + fontSize) from the canvas top
                    const pdfY = pageHeight - y - fontSize;

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
                let font;
                const fontSize = 36;
                if (isHindi && devanagariFont) {
                    font = devanagariFont;
                } else {
                    font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
                }

                const textWidth = font.widthOfTextAtSize(guestName, fontSize);
                const centerX = (pageWidth - textWidth) / 2;
                const centerY = pageHeight / 2;

                page.drawText(guestName, {
                    x: centerX,
                    y: centerY,
                    size: fontSize,
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
