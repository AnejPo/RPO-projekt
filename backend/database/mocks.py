# Tukaj noter so samo ukazi za generiranje mock podatkov za bazo
# TREBA POTEM ZBRISATI!!!

from database.queries import *
from database.utils import create_connection
from flask_bcrypt import Bcrypt

def generate_mock_data():
    connection = create_connection()

    # Ustvari user tabelo
    create_user_table(connection)

    bcypt = Bcrypt()
    # Vstavi mock uporabnike
    users = [
        ("jdoe", "John", "Doe", "jdoe@example.com", "password123"),
        ("asmith", "Alice", "Smith", "asmith@example.com", "password456"),
        ("bjones", "Bob", "Jones", "bjones@example.com", "password789")
    ]
    for username, name, surname, email, password in users:
        hashed_password = bcypt.generate_password_hash(password).decode('utf-8')
        insert_user(connection, username, name, surname, email, hashed_password)
    connection.close()
    
    
    