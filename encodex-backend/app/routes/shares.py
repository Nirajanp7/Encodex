from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models import File, Share
from .. import db
from ..utils.file_handler import read_encrypted_file
import uuid
import os
import io
from datetime import datetime, timedelta

bp = Blueprint('shares', __name__, url_prefix='/api/shares')

@bp.route('', methods=['POST'])
@jwt_required()
def create_share():
    """Create a share link for a file"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        file_id = data.get('fileId')
        if not file_id:
            return jsonify({'error': 'File ID is required'}), 400
        
        file_record = File.query.filter_by(id=file_id, user_id=user_id).first()
        if not file_record:
            return jsonify({'error': 'File not found'}), 404

        token = str(uuid.uuid4())
        
        expires_days = data.get('expiresDays', 7)
        expires_at = datetime.utcnow() + timedelta(days=expires_days) if expires_days else None
        
        share = Share(
            id=str(uuid.uuid4()),
            file_id=file_id,
            token=token,
            expires_at=expires_at
        )
        
        db.session.add(share)
        db.session.commit()
        
        return jsonify({
            'message': 'Share link created',
            'share': share.to_dict(),
            'token': token
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@bp.route('/<token>', methods=['GET'])
def get_shared_file(token):
    try:
        share = Share.query.filter_by(token=token).first()
        if not share:
            return jsonify({'error': 'Share not found'}), 404
        
        if share.expires_at and share.expires_at < datetime.utcnow():
            return jsonify({'error': 'Share link has expired'}), 410
        
        file_record = File.query.get(share.file_id)
        if not file_record:
            return jsonify({'error': 'File not found'}), 404

        return jsonify({
            'file': {
                'id': file_record.id,
                'filename': file_record.filename,
                'size': file_record.original_size,
                'category': file_record.category,
                'docType': file_record.doc_type,
                'ivB64': file_record.iv_b64,
                'createdAt': int(file_record.created_at.timestamp() * 1000)
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/<token>/download', methods=['GET'])
def download_shared_file(token):
    try:
        share = Share.query.filter_by(token=token).first()
        if not share:
            return jsonify({'error': 'Share not found'}), 404
        
        if share.expires_at and share.expires_at < datetime.utcnow():
            return jsonify({'error': 'Share link has expired'}), 410
        
        file_record = File.query.get(share.file_id)
        if not file_record:
            return jsonify({'error': 'File not found'}), 404
        
        if not os.path.exists(file_record.file_path):
            return jsonify({'error': 'File not found on disk'}), 404
        
        encrypted_data = read_encrypted_file(file_record.file_path)
        if encrypted_data is None:
            return jsonify({'error': 'Error reading file'}), 500
        
        return send_file(
            io.BytesIO(encrypted_data),
            as_attachment=True,
            download_name=file_record.filename,
            mimetype='application/octet-stream'
        )
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/<share_id>', methods=['DELETE'])
@jwt_required()
def revoke_share(share_id):
    try:
        user_id = get_jwt_identity()
        
        share = Share.query.get(share_id)
        if not share:
            return jsonify({'error': 'Share not found'}), 404
        
        file_record = File.query.filter_by(id=share.file_id, user_id=user_id).first()
        if not file_record:
            return jsonify({'error': 'Unauthorized'}), 403
        
        db.session.delete(share)
        db.session.commit()
        
        return jsonify({
            'message': 'Share revoked successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@bp.route('/file/<file_id>', methods=['GET'])
@jwt_required()
def list_file_shares(file_id):
    try:
        user_id = get_jwt_identity()
        
        file_record = File.query.filter_by(id=file_id, user_id=user_id).first()
        if not file_record:
            return jsonify({'error': 'File not found'}), 404
        
        shares = Share.query.filter_by(file_id=file_id).all()
        
        return jsonify({
            'shares': [s.to_dict() for s in shares]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

