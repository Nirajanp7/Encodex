# EncodeX Backend

Flask backend for EncodeX encrypted file storage system.

## Setup

1. Create virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Configure environment:
```bash
cp .env.example .env
# Edit .env with your database credentials
```

4. Run the server:
```bash
python run.py
```

The server will start on `http://localhost:5000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get JWT token

### Files
- `POST /api/files/upload` - Upload encrypted file
- `GET /api/files` - List user's files
- `GET /api/files/<id>` - Download file
- `DELETE /api/files/<id>` - Delete file

### Shares
- `POST /api/shares` - Create share link
- `GET /api/shares/<token>` - Get shared file

## Database

By default uses SQLite for development. For production, configure PostgreSQL in `.env`:
```
DATABASE_URL=postgresql://user:password@localhost:5432/encodex
```

