from flask_jwt_extended import create_access_token, create_refresh_token
from datetime import timedelta

def generate_tokens(user_id, email):
    access_token = create_access_token(
        identity=user_id,
        additional_claims={'email': email}
    )
    refresh_token = create_refresh_token(
        identity=user_id,
        additional_claims={'email': email}
    )
    return access_token, refresh_token

