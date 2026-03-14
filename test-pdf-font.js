import { PDFDocument } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import fetch from 'node-fetch';

async function test() {
    try {
        const fontUrl = 'https://raw.githubusercontent.com/google/fonts/main/ofl/notosansdevanagari/NotoSansDevanagari%5Bwdth%2Cwght%5D.ttf';
        console.log("Fetching:", fontUrl);
        const fontRes = await fetch(fontUrl);
        if (!fontRes.ok) throw new Error(`Font fetch failed: ${fontRes.status}`);
        const fontBuffer = await fontRes.arrayBuffer();
        
        const pdfDoc = await PDFDocument.create();
        pdfDoc.registerFontkit(fontkit);
        console.log("Embedding font...");
        const font = await pdfDoc.embedFont(fontBuffer);
        console.log("Font embedded successfully");
    } catch (e) {
        console.error("Error:", e);
    }
}
test();
