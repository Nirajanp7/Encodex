# EncodeX Frontend

End-to-end encrypted document vault frontend built with React, TypeScript, and Vite.

## Quick Start

Install dependencies:
```bash
npm install
```

Run development server:
```bash
npm run dev
```

Build for production:
```bash
npm run build
```

## Available Scripts

- `npm run dev` - Start development server at http://localhost:5173
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Project Structure

```
src/
├── lib/           # Core utilities
│   ├── crypto.ts  # Encryption functions
│   ├── storage.ts # LocalStorage helpers
│   └── types.ts   # TypeScript types
├── pages/         # Page components
│   ├── Vault.tsx
│   ├── Scan.tsx
│   ├── ShareCenter.tsx
│   ├── SharePublic.tsx
│   ├── Activity.tsx
│   └── Settings.tsx
├── App.tsx        # Main app component
├── App.css        # Main styles
└── main.tsx       # Entry point
```

## Tech Stack

- React 19
- TypeScript
- Vite
- Web Crypto API
- CSS Variables

## Features

- Client-side encryption with AES-GCM
- PBKDF2 key derivation
- LocalStorage-based persistence
- Hash-based routing
- Responsive design
