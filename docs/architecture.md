# Architecture Overview

## System Design
The **Wedding Card Auto Personalizer** is a distributed system designed for scalability and reliability. It consists of three main components:

1.  **Frontend (Web App)**: A Next.js application served via Vercel/Netlify. It provides the UI for template management, guest list uploads, and dashboard analytics. It interacts directly with Supabase for data and the Backend API for business logic.
2.  **Backend API**: An Express.js server hosted on a cloud provider (e.g., Railway/Render/AWS). It handles complex business logic, coordinates file uploads, and acts as the producer for the job queue.
3.  **Worker Service**: A background worker (Node.js) that consumes jobs from a Redis queue (BullMQ). It performs resource-intensive tasks:
    *   **PDF Generation**: Composing the invitation PDF using `canvas` and `pdf-lib`.
    *   **WhatsApp Delivery**: Sending messages via Meta's WhatsApp Cloud API.

## Data Flow
1.  **Template Creation**: User uploads images to Supabase Storage -> Save URLs + Config to DB.
2.  **Invitation Request**: User inputs Guest Name -> API receives request -> Validate -> Enqueue Job -> Return "Pending" status.
3.  **Processing**: Worker picks up Job -> Downloads Template & Images -> Generates PDF -> Uploads PDF to Storage -> Sends WhatsApp -> Updates DB Status.

## Tech Stack
*   **Frontend**: Next.js 14, Tailwind CSS, Lucide React, Fabric.js (Canvas)
*   **Backend**: Node.js, Express, BullMQ (Queue)
*   **Database**: Supabase (PostgreSQL)
*   **Storage**: Supabase Storage
*   **Message Queue**: Redis
*   **Notifications**: WhatsApp Cloud API

## Security & Best Practices
*   **Auth**: Supabase Auth (JWT) for all API endpoints.
*   **Validation**: Zod for runtime request validation.
*   **Secrets**: Environment variables for all keys (Supabase keys, WhatsApp tokens).
*   **Rate Limiting**: Implementation in API to prevent abuse.
