import 'regenerator-runtime/runtime.js';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import fs from 'fs';

async function testFont(fontUrl, name) {
    try {
        console.log(`Testing ${name} with font ${fontUrl}`);
        const pdfDoc = await PDFDocument.create();
        pdfDoc.registerFontkit(fontkit);

        const fontRes = await fetch(fontUrl);
        const fontBytes = await fontRes.arrayBuffer();
        const customFont = await pdfDoc.embedFont(fontBytes, { subset: true });

        const page = pdfDoc.addPage([500, 700]);

        page.drawText(name, {
            x: 50,
            y: 500,
            size: 30,
            font: customFont,
            color: rgb(0, 0, 0),
        });

        await pdfDoc.save();
        console.log(`✅ Success for ${name}`);
        return true;
    } catch (err) {
        console.error(`❌ Failed for ${name}:`, err.message);
        return false;
    }
}

async function run() {
    const names = [
        "श्री परेश्वर पंत",
        "श्री महेन्द्र ध्यानी",
        "श्री गोविंदराम ध्यानी",
        "श्रीमती सिंदूरी देवी"
    ];

    const fonts = {
        'Noto Sans': 'https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts@main/hinted/ttf/NotoSansDevanagari/NotoSansDevanagari-Regular.ttf',
        'Noto Serif': 'https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts@main/hinted/ttf/NotoSerifDevanagari/NotoSerifDevanagari-Regular.ttf',
        'Hind': 'https://github.com/google/fonts/raw/main/ofl/hind/Hind-Regular.ttf',
        'Mukta': 'https://github.com/google/fonts/raw/main/ofl/mukta/Mukta-Regular.ttf',
        'Tiro': 'https://github.com/googlefonts/tiro-devanagari-hindi/raw/main/fonts/ttf/TiroDevanagariHindi-Regular.ttf',
        'Yatra': 'https://github.com/google/fonts/raw/main/ofl/yatraone/YatraOne-Regular.ttf',
        'Amita': 'https://github.com/google/fonts/raw/main/ofl/amita/Amita-Regular.ttf',
        'Karma': 'https://github.com/google/fonts/raw/main/ofl/karma/Karma-Regular.ttf',
        'Rozha One': 'https://github.com/google/fonts/raw/main/ofl/rozhaone/RozhaOne-Regular.ttf',
        'Kalam': 'https://github.com/google/fonts/raw/main/ofl/kalam/Kalam-Regular.ttf'
    };

    for (const [fontName, fontUrl] of Object.entries(fonts)) {
        console.log(`\n--- Testing Font: ${fontName} ---`);
        let allSuccess = true;
        for (const name of names) {
            const success = await testFont(fontUrl, name);
            if (!success) allSuccess = false;
        }
        if (allSuccess) {
            console.log(`\n🎉🎉🎉 FONT ${fontName} WORKS FOR ALL NAMES! 🎉🎉🎉\n`);
        }
    }
}

run();
