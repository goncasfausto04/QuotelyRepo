# Quotely 🎯

> AI-powered quote comparison platform for smarter procurement decisions

Quotely is a modern web application that helps businesses collect, analyze, and compare supplier quotes intelligently. Using AI-powered analysis and personalized scoring, Quotely transforms the tedious quote comparison process into a data-driven decision-making tool.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-18.x-61DAFB?logo=react)](https://reactjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?logo=supabase)](https://supabase.com/)

## ✨ Features

### 🤖 AI-Powered Quote Analysis and chatbot
- **Smart Email Parsing**: Automatically extract pricing, lead times, warranty details, and payment terms from supplier emails
- **Conversational Briefing Creation**: AI assistant helps you create detailed RFQs (Request for Quote) through natural conversation
- **Intelligent Data Extraction**: Extract structured data from unstructured supplier responses

### 📊 Advanced Comparison Tools
- **Customizable Scoring**: Set custom importance weights (0-5 scale) for different criteria (price, speed, warranty, etc.)
- **Multi-Quote Comparison**: Compare unlimited quotes side-by-side in an intuitive table format
- **Visual Analytics**: Get instant insights with best price, fastest delivery, and best overall match cards
- **PDF Report Generation**: Export professional comparison reports with all quote details

### 🎨 Modern User Experience
- **Dark Mode Support**: Full dark/light theme with system preference detection
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Multi-Language Ready**: i18n infrastructure prepared for English and Portuguese (extensible)
- **Real-time Updates**: Live data synchronization across your devices.

### 🔐 Security & Privacy
- **Secure Authentication**: Supabase Auth with email/password and social logins
- **Row-Level Security**: Your quotes are private and accessible only to you
- **Encrypted Storage**: All sensitive data encrypted at rest and in transit

## https://quotely-repo.vercel.app 

---

## 🛠️ Running & operating

### Local development
```bash
cd server && cp .env.example .env   # fill it in
npm install && npm run dev          # http://localhost:3001

cd quotely-app && cp .env.example .env
npm install && npm start            # http://localhost:3000
```

### Secrets: never commit them
Only `REACT_APP_*` variables belong in the frontend, and they are **public** once built.
`SUPABASE_SERVICE_KEY`, `GEMINI_API_KEY` and the Gmail credentials live only in `server/.env`
and in the Render dashboard. Google automatically disables Gemini keys it finds in public
GitHub repos, so a committed key gets "regenerated" on you.

### Gmail refresh token keeps expiring?
If the Google Cloud OAuth consent screen is in **Testing**, refresh tokens expire after **7 days**.
Google Cloud Console → APIs & Services → OAuth consent screen → **Publish app**. Then get a new
token once with `cd server && npm run gmail:token` and update `GMAIL_API_REFRESH_TOKEN` on Render.

### Cold starts & Supabase pausing
- Render free instances sleep after 15 min idle; Supabase free projects pause after ~7 days idle.
- `.github/workflows/keep-alive.yml` pings `GET /health/db` every 10 min, which keeps both awake.
  Set the repo variable `BACKEND_URL` (Settings → Secrets and variables → Actions → Variables).
- The frontend also wakes the backend on page load and retries safe requests through a cold start.

### Database security
Run `supabase/security.sql` in the Supabase SQL editor to enable Row Level Security.
The backend verifies the user's Supabase access token on every private endpoint.
