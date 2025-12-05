import os
import uuid
from werkzeug.utils import secure_filename

def save_encrypted_file(file_data, upload_folder):

    unique_id = str(uuid.uuid4())
    filename = f"{unique_id}.enc"
    
    os.makedirs(upload_folder, exist_ok=True)
    
    file_path = os.path.join(upload_folder, filename)
    
    with open(file_path, 'wb') as f:
        f.write(file_data)
    
    return file_path

def delete_file(file_path):
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
            return True
    except Exception as e:
        print(f"Error deleting file: {e}")
    return False

def read_encrypted_file(file_path):
    try:
        with open(file_path, 'rb') as f:
            return f.read()
    except Exception as e:
        print(f"Error reading file: {e}")
        return None

