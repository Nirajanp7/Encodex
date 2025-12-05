from flask import Blueprint, request, jsonify, send_file, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
from ..models import User, File
from .. import db
from ..utils.file_handler import save_encrypted_file, delete_file, read_encrypted_file
import uuid
import os
import io

bp = Blueprint('files', __name__, url_prefix='/api/files')

@bp.route('/upload', methods=['POST'])
@jwt_required()
def upload_file():
    try:
        user_id = get_jwt_identity()
        
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        filename = request.form.get('filename')
        original_size = request.form.get('size')
        category = request.form.get('category', 'Other')
        doc_type = request.form.get('docType', 'Other')
        iv_b64 = request.form.get('ivB64')
        
        if not all([filename, original_size, iv_b64]):
            return jsonify({'error': 'Missing required metadata'}), 400
        
        file.seek(0, os.SEEK_END)
        file_size = file.tell()
        file.seek(0)
        
        if file_size > current_app.config['MAX_FILE_SIZE']:
            return jsonify({'error': 'File size exceeds limit'}), 413
        
        encrypted_data = file.read()
        
        user_upload_folder = os.path.join(current_app.config['UPLOAD_FOLDER'], user_id)
        
        file_path = save_encrypted_file(encrypted_data, user_upload_folder)
        
        file_record = File(
            id=str(uuid.uuid4()),
            user_id=user_id,
            filename=filename,
            original_size=int(original_size),
            category=category,
            doc_type=doc_type,
            file_path=file_path,
            iv_b64=iv_b64
        )
        
        db.session.add(file_record)
        db.session.commit()
        
        return jsonify({
            'message': 'File uploaded successfully',
            'file': file_record.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@bp.route('', methods=['GET'])
@jwt_required()
def list_files():
    try:
        user_id = get_jwt_identity()
        
        category = request.args.get('category')
        search = request.args.get('search', '').lower()
        
        query = File.query.filter_by(user_id=user_id)
        
        if category and category != 'All':
            query = query.filter_by(category=category)
        
        files = query.order_by(File.created_at.desc()).all()
        
        if search:
            files = [f for f in files if search in f.filename.lower()]
        
        return jsonify({
            'files': [f.to_dict() for f in files]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/<file_id>', methods=['GET'])
@jwt_required()
def download_file(file_id):
    try:
        user_id = get_jwt_identity()
        
        file_record = File.query.filter_by(id=file_id, user_id=user_id).first()
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

@bp.route('/<file_id>', methods=['DELETE'])
@jwt_required()
def delete_file_route(file_id):
    try:
        user_id = get_jwt_identity()
        
        file_record = File.query.filter_by(id=file_id, user_id=user_id).first()
        if not file_record:
            return jsonify({'error': 'File not found'}), 404
        
        delete_file(file_record.file_path)
        
        db.session.delete(file_record)
        db.session.commit()
        
        return jsonify({
            'message': 'File deleted successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@bp.route('/<file_id>/metadata', methods=['GET'])
@jwt_required()
def get_file_metadata(file_id):
    try:
        user_id = get_jwt_identity()
        
        file_record = File.query.filter_by(id=file_id, user_id=user_id).first()
        if not file_record:
            return jsonify({'error': 'File not found'}), 404
        
        return jsonify({
            'file': file_record.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

