declare module 'pdfkit' {
    class PDFDocument {
        constructor(options?: {
            size?: [number, number] | string;
            margin?: number;
            margins?: { top: number; bottom: number; left: number; right: number };
            layout?: 'portrait' | 'landscape';
        });

        on(event: 'data', callback: (chunk: Buffer) => void): this;
        on(event: 'end', callback: () => void): this;
        on(event: 'error', callback: (err: Error) => void): this;

        addPage(options?: {
            size?: [number, number] | string;
            margin?: number;
        }): this;

        image(
            src: string | Buffer,
            x?: number,
            y?: number,
            options?: { width?: number; height?: number; fit?: [number, number]; align?: string; valign?: string }
        ): this;

        font(name: string): this;
        fontSize(size: number): this;
        fillColor(color: string): this;
        text(
            text: string,
            x?: number,
            y?: number,
            options?: { width?: number; align?: string; lineBreak?: boolean }
        ): this;

        rect(x: number, y: number, w: number, h: number): this;
        fill(color: string): this;

        end(): void;

        _font: { ascender: number };
    }

    export default PDFDocument;
}
