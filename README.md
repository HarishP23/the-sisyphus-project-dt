# Sisyphus Project - Pomodoro Timer

A beautiful and highly functional Pomodoro timer web application built with Next.js, MongoDB, and NextAuth.

## Features

- 🍅 Customizable Pomodoro, Short Break, and Long Break durations
- ✅ Task management with estimated vs actual pomodoros tracking
- 📊 Reports and analytics for productivity tracking
- 🎨 Fully customizable themes and colors
- 🔔 Alarm and background sounds
- 💾 Data persistence with MongoDB
- 🔐 Email authentication
- 📱 Fully responsive design

## Getting Started

### Prerequisites

- Node.js 18+ installed
- MongoDB database (MongoDB Atlas recommended)

### Environment Setup

1. Clone the repository
2. Copy `.env.example` to `.env`:

\`\`\`bash
cp .env.example .env
\`\`\`

3. Fill in your environment variables:

\`\`\`env
# MongoDB Connection String
MONGODB_URI=your_mongodb_connection_string_here

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret_here
\`\`\`

### Generate NextAuth Secret

Run this command to generate a secure secret:

\`\`\`bash
openssl rand -base64 32
\`\`\`

### Installation

\`\`\`bash
npm install
\`\`\`

### Run Development Server

\`\`\`bash
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

\`\`\`bash
npm run build
npm start
\`\`\`

## Deployment

This app is optimized for deployment on Vercel:

1. Push your code to GitHub
2. Import the project on Vercel
3. Add your environment variables
4. Deploy!

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: MongoDB
- **Authentication**: NextAuth.js
- **UI**: Tailwind CSS, shadcn/ui
- **Icons**: Lucide React
- **Fonts**: Geist Sans & Mono

## License

MIT
