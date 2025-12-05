from . import db
from datetime import datetime
import uuid

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    name = db.Column(db.String(255), nullable=False)
    salt_b64 = db.Column(db.Text, nullable=False)
    kdf_iterations = db.Column(db.Integer, nullable=False)
    verifier_b64 = db.Column(db.Text, nullable=False)
    verifier_iv_b64 = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    files = db.relationship('File', backref='owner', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'name': self.name,
            'salt_b64': self.salt_b64,
            'kdf_iterations': self.kdf_iterations,
            'verifier_b64': self.verifier_b64,
            'verifier_iv_b64': self.verifier_iv_b64,
            'created_at': self.created_at.isoformat()
        }

class File(db.Model):
    __tablename__ = 'files'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False, index=True)
    filename = db.Column(db.String(255), nullable=False)
    original_size = db.Column(db.Integer, nullable=False)
    category = db.Column(db.String(50), nullable=False)
    doc_type = db.Column(db.String(50), nullable=False)
    file_path = db.Column(db.String(512), nullable=False)
    iv_b64 = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    shares = db.relationship('Share', backref='file', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'owner': self.user_id,
            'filename': self.filename,
            'size': self.original_size,
            'category': self.category,
            'docType': self.doc_type,
            'ivB64': self.iv_b64,
            'createdAt': int(self.created_at.timestamp() * 1000)
        }

class Share(db.Model):
    __tablename__ = 'shares'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    file_id = db.Column(db.String(36), db.ForeignKey('files.id'), nullable=False, index=True)
    token = db.Column(db.String(36), unique=True, nullable=False, index=True)
    shared_with_email = db.Column(db.String(255), nullable=True, index=True)  # Email of recipient user
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    expires_at = db.Column(db.DateTime, nullable=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'file_id': self.file_id,
            'token': self.token,
            'shared_with_email': self.shared_with_email,
            'created_at': self.created_at.isoformat(),
            'expires_at': self.expires_at.isoformat() if self.expires_at else None
        }

