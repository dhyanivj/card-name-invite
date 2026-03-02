# Future Improvements

1.  **Drag-and-Drop Enhancement**:
    *   Add support for multiple text fields (Date, Venue, RSVP).
    *   Allow changing font families using Google Fonts API.
    *   Add sticker/emoji support on the canvas.

2.  **User Experience**:
    *   **Live Preview**: Show a real-time preview of the PDF generation on the client side using stricter Fabric-to-PDF matching.
    *   **Batch Upload**: Allow uploading a CSV file for guest list import.

3.  **WhatsApp Integration**:
    *   **Two-way Communication**: Handle "RSVP Yes/No" replies from guests via Webhooks.
    *   **Read Receipts**: Track when the guest opens the PDF.

4.  **Performance & Scaling**:
    *   **Serverless PDF Gen**: Move the PDF generation to AWS Lambda or Vercel Functions to handle localized spikes (e.g., 1000s of invites at once).
    *   **CDN**: Serve generated PDFs via a global CDN for faster downloads.

5.  **Security**:
    *   **Signed URLs**: Use signed URLs for the invitations instead of public buckets to prevent unauthorized access.
    *   **Phone Verification**: sending an OTP to the user before allowing them to use a phone number as "Sender".
