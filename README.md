# Quarterly Statement Parser

## Description  
This project is a web application built with Next.js that allows users to upload PDF documents, extract data from them, and view the results in CSV format. It utilizes Supabase for backend services, including authentication and file storage.

## Features
- User authentication (sign up, login, password reset)
- PDF upload and storage
- Data extraction from PDF files
- CSV generation from extracted data
- User-friendly dashboard for managing PDFs

## Technologies Used
- **Frontend**: Next.js, React, TypeScript
- **Backend**: Supabase
- **Styling**: Tailwind CSS
- **Utilities**: Radix UI for components

## Getting Started

### Prerequisites
- Node.js
- npm or yarn
- Supabase account

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/DanielF21/financial-parsing.git
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env.local` file in the root of the project and add your Supabase credentials:
   ```plaintext
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_KEY=your_supabase_service_key
   OPENAI_API_KEY=your_openai_api_key
   ```

4. Please contact me directly to get the Supabase table / bucket configuration


### Running the Application
To start the development server, run:
```bash
npm run dev
```

