import sqlite3
from sqlite3 import Error
from database.utils import execute_query

def create_user_table(connection):
    create_user_table_query = """
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        name TEXT NOT NULL,
        surname TEXT NOT NULL,
        email TEXT NOT NULL,
        password TEXT NOT NULL
    );
    """
    execute_query(connection, create_user_table_query)
    
def insert_user(connection, username, name, surname, email, password):
    insert_user_query = f"""
    INSERT INTO
        users (username, name, surname, email, password)
    VALUES
        ('{username}', '{name}', '{surname}', '{email}', '{password}');
    """
    execute_query(connection, insert_user_query)
    
def delete_user(connection, id=None, username=None):
    delete_user_query = f"""
    DELETE FROM
        users
    WHERE
        username = '{username}' OR id = {id};
    """
    execute_query(connection, delete_user_query)
    
def get_all_users(connection):
    get_all_users_query = "SELECT * FROM users;"
    cursor = connection.cursor()
    try:
        cursor.execute(get_all_users_query)
        users = cursor.fetchall()
        return users
    except Error as e:
        print(f"The error '{e}' occurred")
        return []
    
def get_user_by_username(connection, username):
    get_user_query = f"""
    SELECT *
    FROM users
    WHERE username = '{username}';
    """
    cursor = connection.cursor()
    try:
        cursor.execute(get_user_query)
        user = cursor.fetchone()
        return user
    except Error as e:
        print(f"The error '{e}' occurred")
        return None
    
def get_user_by_id(connection, id):
    get_user_query = f"""
    SELECT *
    FROM users
    WHERE id = {id};
    """
    cursor = connection.cursor()
    try:
        cursor.execute(get_user_query)
        user = cursor.fetchone()
        return user
    except Error as e:
        print(f"The error '{e}' occurred")
        return None
    
def update_user_username(connection, id, new_username):
    update_username_query = f"""
    UPDATE
        users
    SET
        username = '{new_username}'
    WHERE
        id = {id};
    """
    execute_query(connection, update_username_query)
    
def create_user_grade_table(connection):
    create_user_grade_table_query = """
    CREATE TABLE IF NOT EXISTS user_grades (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        task_id TEXT,
        grade REAL,
        FOREIGN KEY (user_id) REFERENCES users (id)
    );
    """
    execute_query(connection, create_user_grade_table_query)
    
def insert_user_grade(connection, user_id, task_id, grade):
    insert_user_grade_query = f"""
    INSERT INTO
        user_grades (user_id, task_id, grade)
    VALUES
        ({user_id}, '{task_id}', {grade});
    """
    execute_query(connection, insert_user_grade_query)
    
def get_user_grades(connection, user_id):
    get_user_grades_query = f"""
    SELECT *
    FROM user_grades
    WHERE user_id = {user_id};
    """
    cursor = connection.cursor()
    try:
        cursor.execute(get_user_grades_query)
        grades = cursor.fetchall()
        return grades
    except Error as e:
        print(f"The error '{e}' occurred")
        return []
    
def update_user_grade(connection, user_id, task_id, new_grade):
    update_user_grade_query = f"""
    UPDATE
        user_grades
    SET
        grade = {new_grade}
    WHERE
        user_id = {user_id} AND task_id = '{task_id}';
    """
    execute_query(connection, update_user_grade_query)
    
def delete_user_grade(connection, user_id, task_id):
    delete_user_grade_query = f"""
    DELETE FROM
        user_grades
    WHERE
        user_id = {user_id} AND task_id = '{task_id}';
    """
    execute_query(connection, delete_user_grade_query)
    
def get_all_user_grades(connection):
    get_all_user_grades_query = "SELECT * FROM user_grades;"
    cursor = connection.cursor()
    try:
        cursor.execute(get_all_user_grades_query)
        grades = cursor.fetchall()
        return grades
    except Error as e:
        print(f"The error '{e}' occurred")
        return []
    
def get_user_grade_for_task(connection, user_id, task_id):
    get_user_grade_query = f"""
    SELECT *
    FROM user_grades
    WHERE user_id = {user_id} AND task_id = '{task_id}';
    """
    cursor = connection.cursor()
    try:
        cursor.execute(get_user_grade_query)
        grade = cursor.fetchone()
        return grade
    except Error as e:
        print(f"The error '{e}' occurred")
        return None
    
def get_users_grades_for_task(connection, task_id):
    get_users_grades_query = f"""
    SELECT *
    FROM user_grades
    WHERE task_id = '{task_id}';
    """
    cursor = connection.cursor()
    try:
        cursor.execute(get_users_grades_query)
        grades = cursor.fetchall()
        return grades
    except Error as e:
        print(f"The error '{e}' occurred")
        return []