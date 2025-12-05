# EncodeX - Secure File Storage

A secure file storage system where files are encrypted on your device before upload. The server cannot decrypt your files.

## What Does It Do?

- Upload files securely (encrypted before leaving your device)
- Download and decrypt files with your password
- Share files with others via secure links
- Organize files by categories (Identification, Insurance, Legal, Financial)
- Modern dark theme UI

## How It Works

1. You upload a file
2. File is encrypted on your device with AES-256-GCM
3. Encrypted file is sent to server
4. Server stores the encrypted file (cannot read it)
5. When you download, file is decrypted on your device

**Important:** The server never sees your files in plain text. Only you can decrypt them with your password.

## What You Need

- Python 3.8 or higher
- Node.js 18 or higher

## How to Run

### Step 1: Start the Backend

Open a terminal and run:

```bash
# Go to backend folder
cd encodex-backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate

# Install required packages
pip install -r requirements.txt

# Setup database
python init_db.py

# Start the backend server
python run.py
```

Backend will run on: **http://localhost:5000**

### Step 2: Start the Frontend

Open a **new terminal** and run:

```bash
# Go to frontend folder
cd encodex-frontend

# Install packages
npm install

# Start the frontend
npm run dev
```

Frontend will run on: **http://localhost:5173**

### Step 3: Use the App

1. Open your browser and go to: **http://localhost:5173**
2. Click "Create an account" to register
3. Enter your email and password
4. Start uploading files!

## Current Features

✅ **User Registration & Login** - Create account with email and password  
✅ **File Upload** - Drag & drop or browse to upload files (encrypted automatically)  
✅ **File Download** - Download and decrypt your files  
✅ **File Delete** - Remove files you don't need  
✅ **File Sharing** - Create secure share links for others  
✅ **File Categories** - Organize by Identification, Insurance, Legal, Financial  
✅ **Dark Theme UI** - Modern purple/blue gradient design  
✅ **Activity Tracking** - See your recent actions  

## Tech Stack

**Frontend:**
- React with TypeScript
- Web Crypto API (for encryption)
- Axios (for API calls)

**Backend:**
- Python Flask
- SQLite database (for development)
- JWT tokens (for authentication)

## Security

- **AES-256-GCM encryption** - Files encrypted before upload
- **PBKDF2** - Password protection with 150,000 iterations
- **Zero-knowledge** - Server cannot decrypt your files
- **JWT authentication** - Secure API access

## File Storage

Your encrypted files are stored in:
```
encodex-backend/uploads/
```

You can open these files - they're unreadable encrypted data! Only your password can decrypt them.

## Database

The app uses SQLite (a simple file-based database). The database file is:
```
encodex-backend/encodex.db
```

It stores:
- User accounts (email, encrypted password verifier)
- File metadata (filename, size, category)
- Share links

**Note:** It does NOT store your actual files or encryption keys!

## Troubleshooting

**Backend won't start?**
- Make sure Python 3.8+ is installed
- Activate the virtual environment first
- Run `pip install -r requirements.txt` again

**Frontend won't start?**
- Make sure Node.js 18+ is installed
- Delete `node_modules` folder and run `npm install` again

**Can't connect?**
- Make sure backend is running on port 5000
- Make sure frontend is running on port 5173
- Check if another app is using these ports

## Configuration

Backend settings are in `encodex-backend/.env`:

```env
DATABASE_URL=sqlite:///encodex.db
JWT_SECRET_KEY=your-secret-key
UPLOAD_FOLDER=./uploads
MAX_FILE_SIZE=104857600
```

Frontend settings in `encodex-frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:5000
```

## Production Use

For production deployment:
- Use PostgreSQL instead of SQLite
- Use strong secret keys
- Enable HTTPS
- Add rate limiting
- Regular backups

## License

MIT License - See LICENSE file

## Author

Nirajan - [GitHub](https://github.com/Nirajanp7)

---

⭐ **Star this project if you find it useful!**
