from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models import User
from .. import db
from ..utils.jwt_handler import generate_tokens
import uuid

bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@bp.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        
        required = ['email', 'name', 'saltB64', 'kdfIterations', 'verifierB64', 'verifierIvB64']
        if not all(field in data for field in required):
            return jsonify({'error': 'Missing required fields'}), 400
        
        if User.query.filter_by(email=data['email']).first():
            return jsonify({'error': 'Email already registered'}), 409
        
        user = User(
            id=str(uuid.uuid4()),
            email=data['email'],
            name=data['name'],
            salt_b64=data['saltB64'],
            kdf_iterations=data['kdfIterations'],
            verifier_b64=data['verifierB64'],
            verifier_iv_b64=data['verifierIvB64']
        )
        
        db.session.add(user)
        db.session.commit()
        
        access_token, refresh_token = generate_tokens(user.id, user.email)
        
        return jsonify({
            'message': 'User registered successfully',
            'user': {
                'id': user.id,
                'email': user.email,
                'name': user.name
            },
            'access_token': access_token,
            'refresh_token': refresh_token
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        
        if not data.get('email'):
            return jsonify({'error': 'Email is required'}), 400
        
        user = User.query.filter_by(email=data['email']).first()
        if not user:
            return jsonify({'error': 'No account with this email'}), 404
        
        return jsonify({
            'user': {
                'id': user.id,
                'email': user.email,
                'name': user.name,
                'saltB64': user.salt_b64,
                'kdfIterations': user.kdf_iterations,
                'verifierB64': user.verifier_b64,
                'verifierIvB64': user.verifier_iv_b64
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/verify', methods=['POST'])
def verify():
    try:
        data = request.get_json()
        
        if not data.get('email') or not data.get('verified'):
            return jsonify({'error': 'Invalid verification request'}), 400
        
        user = User.query.filter_by(email=data['email']).first()
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        access_token, refresh_token = generate_tokens(user.id, user.email)
        
        return jsonify({
            'message': 'Login successful',
            'user': {
                'id': user.id,
                'email': user.email,
                'name': user.name
            },
            'access_token': access_token,
            'refresh_token': refresh_token
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        return jsonify({
            'user': {
                'id': user.id,
                'email': user.email,
                'name': user.name
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

