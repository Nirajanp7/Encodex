# EncodeX

End-to-end encrypted document vault with secure sharing capabilities.

## Features

- 🔐 Client-side encryption using Web Crypto API
- 📁 Secure document storage with categories
- 📸 Document scanning and upload
- 🔗 Secure file sharing
- 📊 Activity tracking
- ⚙️ User settings management

## Tech Stack

- React 19 with TypeScript
- Vite for fast development
- Web Crypto API for encryption
- Local Storage for data persistence

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Nirajanp7/Encodex.git
cd Encodex
```

2. Navigate to frontend directory:
```bash
cd encodex-frontend
```

3. Install dependencies:
```bash
npm install
```

### Running the Application

Start the development server:
```bash
npm run dev
```


## Usage

1. **Register**: Create a new account with email and password
2. **Upload**: Add documents to your secure vault
3. **Scan**: Capture and encrypt document photos
4. **Share**: Generate secure sharing links
5. **Activity**: Monitor all vault activities

## Security

- All encryption happens client-side
- Passwords are never stored, only derived keys
- PBKDF2 key derivation with 150,000 iterations
- AES-GCM encryption for all documents

## License

MIT
