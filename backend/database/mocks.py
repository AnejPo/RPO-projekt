# Tukaj noter so samo ukazi za generiranje mock podatkov za bazo
# TREBA POTEM ZBRISATI!!!

from backend.database.queries import *
from backend.database.utils import create_connection

def generate_mock_data():
    connection = create_connection()

    # Ustvari user tabelo
    create_user_table(connection)

    # Vstavi mock uporabnike
    insert_user(connection, "jdoe", "John", "Doe", "jdoe@example.com", "password123")
    insert_user(connection, "asmith", "Alice", "Smith", "asmith@example.com", "password456")
    insert_user(connection, "bjones", "Bob", "Jones", "bjones@example.com", "password789")
    
    create_user_grade_table(connection)
    insert_user_grade(connection, 1, "Math", 95)
    insert_user_grade(connection, 2, "Science", 88)
    
    insert_user_grade(connection, 3, "History", 76)
    insert_user_grade(connection, 1, "English", 89)
    
def clear_mock_data():
    connection = create_connection()
    
    # Izbriši vse uporabnike
    delete_user(connection, username="jdoe")
    delete_user(connection, username="asmith")
    delete_user(connection, username="bjones")
    
    delete_user_grade(connection, user_id=1)
    delete_user_grade(connection, user_id=2)
    delete_user_grade(connection, user_id=3)
    