# WeddingInviter 💍

A modern, full-stack web application designed to automate the process of creating and sending personalized wedding invitations. With WeddingInviter, you can upload your blank card designs, define text placeholders visually on an interactive canvas, and generate print-ready, multi-page PDFs customized for each individual guest in seconds.

## ✨ Features

- **🎨 Visual Template Builder**: Upload multiple images (pages) to create a single template.
- **🖱️ Drag-and-Drop Editor**: Use an interactive canvas to visually position where the guest's name should appear. Customize font family, size, and color.
- **👥 Guest Management**: Keep a categorized list of guests for each unique invitation template.
- **📄 On-Demand PDF Generation**: Instantaneously generate and download personalized PDFs. Handled entirely via `pdf-lib` to ensure perfect pixel placement and typography.
- **🔒 Password Protection**: Built-in global password gateway to keep your dashboard and templates private.
- **📱 Fully Responsive**: A beautiful, premium glassmorphic UI that works flawlessly across mobile phones, tablets, and desktop computers.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS (Premium Glassmorphism & custom animations)
- **Canvas/Editor**: Fabric.js
- **PDF Manipulation**: `pdf-lib`
- **Database & Storage**: Supabase (PostgreSQL & Object Storage)
- **Authentication**: Custom Server-side API verification with session persistence

---

## 🚀 Getting Started

### Prerequisites

You need Node.js installed on your machine and a [Supabase](https://supabase.com/) account to host the database and storage.

### 1. Clone the repository

```bash
git clone https://github.com/your-username/wedding-invite-card.git
cd wedding-invite-card
```

### 2. Install dependencies

This project is structured as a monorepo. Run the installation from the root:

```bash
npm install
```

### 3. Setup Supabase

You'll need a Supabase project with the following setup:
1. **Database Tables**: Create `templates` and `invitations` tables.
2. **Storage Bucket**: Create a public storage bucket named `assets` for storing the uploaded template images.

### 4. Configure Environment Variables

Navigate to the `apps/web` directory and create a `.env.local` file:

```bash
cd apps/web
touch .env.local
```

Populate the `.env.local` file with your credentials:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Application Security
APP_PASSWORD=your_secure_password # The password to unlock the dashboard

# API endpoints
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

### 5. Run the Development Server

From the root directory, start the Next.js development server:

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000). You will be greeted by the password gate. Enter the `APP_PASSWORD` you configured to access the dashboard!

---

## 🚢 Deployment

This application is fully optimized for **Vercel**. 

1. Push your code to a GitHub repository.
2. Import the project into Vercel.
3. Because this is a monorepo structure, Vercel might ask for the Root Directory. Set the Root Directory to `apps/web` (or leave it as root and ensure the build command is `cd apps/web && npm run build`).
4. Add all the environment variables from your `.env.local` to the Vercel project settings.
5. Deploy!

---

## 📝 License

This project is open-source and available under the [MIT License](LICENSE).
