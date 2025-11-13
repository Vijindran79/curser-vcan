# Vcanship - One-Stop Global Logistics Platform

AI-driven logistics platform for finding the cheapest global shipping rates for parcels and freight.

## 🚀 Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:5173`

## 🎯 Features

- **Multi-Service Booking**: Parcel, FCL, LCL, Air Freight, Railway, Inland, Bulk Cargo
- **AI-Powered Quotes**: Real-time rates with intelligent fallbacks
- **Google Maps Integration**: Address autocomplete and validation
- **13 Languages**: Full internationalization
- **Firebase Backend**: Secure API key management
- **Real Quotes**: Shippo, Sea Rates, and AI-powered estimates
- **Document Management**: Upload/download shipping labels and certificates
- **Subscription System**: Stripe integration for Pro features
- **AI Code Reviews**: CodeRabbit integration for automated PR reviews

## 🔧 Tech Stack

- **Frontend**: Vite + React + TypeScript
- **Backend**: Firebase Functions, Firestore
- **APIs**: Shippo, Sea Rates, Google Maps, Geoapify, Gemini AI
- **Payment**: Stripe
- **Deployment**: Firebase Hosting

## 📝 Environment Variables

Create `.env.local`:

```
VITE_GEMINI_API_KEY=your_api_key_here
```

## 🏗️ Firebase Setup

```bash
cd functions
npm install
firebase deploy --only functions
```

## 🤖 CodeRabbit Setup

This repository uses CodeRabbit for AI-powered code reviews. See [CODERABBIT_SETUP.md](./CODERABBIT_SETUP.md) for installation and usage instructions.

## 📄 License

Proprietary - All rights reserved
