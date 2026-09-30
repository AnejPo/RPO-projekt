import os
import sqlite3
from sqlite3 import Error

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "database.db")

def create_connection():
    path = DB_PATH
    connection = None
    try:
        connection = sqlite3.connect(path)
        print("Connection to SQLite DB successful")
    except Error as e:
        print(f"The error '{e}' occurred")
    return connection

def execute_query(connection, query):
    cursor = connection.cursor()
    try:
        cursor.execute(query)
        connection.commit()
        print("Query executed successfully")
    except Error as e:
        print(f"The error '{e}' occurred")