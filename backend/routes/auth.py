from flask import Blueprint, request, jsonify, session
from flask_bcrypt import Bcrypt
from database.utils import create_connection
from database.queries import (
    create_user_table,
    insert_user,
    get_user_by_username,
    get_user_by_id
)
import jwt
import datetime
from functools import wraps

auth_bp = Blueprint('auth', __name__)
bcrypt = Bcrypt()

# Secret key za JWT tokene (v produkciji naj bo v .env datoteki ker zdaj ni varno)
SECRET_KEY = 'to_je_zelo_varno_geslo-ali-pa-ne!'

def hash_password(password):
    #Hash za geslo
    return bcrypt.generate_password_hash(password).decode('utf-8')

def verify_password(hashed_password, password):
    #Preveri geslo
    return bcrypt.check_password_hash(hashed_password, password)

def token_required(f):
    #Dekorator/wrapper za zaščito enpointov. Samo daš nad endpoint ki ga želiš zaščitit in dela samo
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        
        if not token:
            return jsonify({'message': 'Token manjka!', 'authenticated': False}), 401
        
        try:
            if token.startswith('Bearer '):
                token = token[7:]
            
            data = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
            current_user_id = data['user_id']
            
            connection = create_connection()
            user = get_user_by_id(connection, current_user_id)
            connection.close()
            
            if not user:
                return jsonify({'message': 'Uporabnik ne obstaja!', 'authenticated': False}), 401
            
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token je potekel!', 'authenticated': False}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Token ni veljaven!', 'authenticated': False}), 401
        
        return f(current_user_id, *args, **kwargs)
    
    return decorated

@auth_bp.route('/login', methods=['POST'])
def login():
    """
    POST /auth/login
    
    Frontend posle:
    {
        "username": "...",
        "password": "..."
    }
    
    Backend vrne:
    {
        "message": "...",
        "success": true/false,
        "token": "...",
        "user": {
            "id": ...,
            "username": "...",
            "name": "...",
            "surname": "...",
            "email": "..."
        }
    }
    """
    try:
        data = request.get_json()
        
        if not data or not data.get('username') or not data.get('password'):
            return jsonify({'message': 'Uporabniško ime in geslo sta obvezna!', 'success': False}), 400
        
        username = data['username']
        password = data['password']
        
        connection = create_connection()
        
        # Ustvari tabelo če še ne obstaja
        create_user_table(connection)
        
        # Poišči uporabnika
        user = get_user_by_username(connection, username)
        connection.close()
        
        if not user:
            return jsonify({'message': 'Napačno uporabniško ime ali geslo!', 'success': False}), 401
        
        # user je tuple: (id, username, name, surname, email, password)
        user_id = user[0]
        stored_password = user[5]
        
        # Preveri geslo
        if not verify_password(stored_password, password):
            return jsonify({'message': 'Napačno uporabniško ime ali geslo!', 'success': False}), 401
        
        # Generiraj JWT token
        token = jwt.encode({
            'user_id': user_id,
            'username': username,
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        }, SECRET_KEY, algorithm='HS256')
        
        return jsonify({
            'message': 'Prijava uspešna!',
            'success': True,
            'token': token,
            'user': {
                'id': user_id,
                'username': user[1],
                'name': user[2],
                'surname': user[3],
                'email': user[4]
            }
        }), 200
        
    except Exception as e:
        print(f"Error in login: {e}")
        return jsonify({'message': 'Napaka pri prijavi!', 'success': False}), 500

@auth_bp.route('/verify', methods=['GET'])
@token_required
def verify_token(current_user_id):
    """
    GET /auth/verify
    
    Frontend pošlje:
        Headers:
            Authorization:
                Bearer <token>
    Backend vrne:
    {
        "authenticated": true/false,
        "user": {
            "id": ...,
            "username": "...",
            "name": "...",
            "surname": "...",
            "email": "..."
        }
    }
    """
    # Preveri veljavnost tokena in vrne podatke
    try:
        connection = create_connection()
        user = get_user_by_id(connection, current_user_id)
        connection.close()
        
        if not user:
            return jsonify({'message': 'Uporabnik ne obstaja!', 'authenticated': False}), 401
        
        return jsonify({
            'authenticated': True,
            'user': {
                'id': user[0],
                'username': user[1],
                'name': user[2],
                'surname': user[3],
                'email': user[4]
            }
        }), 200
        
    except Exception as e:
        print(f"Error in token verification: {e}")
        return jsonify({'message': 'Napaka pri preverjanju!', 'authenticated': False}), 500

@auth_bp.route('/logout', methods=['POST'])
def logout():
    """
    POST /auth/logout
    
    Backend vrne:
    {
        "message": "...",
        "success": true/false
    }
    """
    return jsonify({
        'message': 'Odjava uspešna!',
        'success': True
    }), 200
