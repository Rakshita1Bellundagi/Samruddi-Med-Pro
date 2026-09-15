import sqlite3
import os

db_path = os.path.join(os.path.abspath(os.path.dirname(__file__)), 'medical_shop.db')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    print("Adding s_no column to bill_item table...")
    cursor.execute("ALTER TABLE bill_item ADD COLUMN s_no INTEGER DEFAULT 0;")
    conn.commit()
    print("Column s_no added successfully.")
except sqlite3.OperationalError as e:
    if "duplicate column name" in str(e).lower():
        print("Column s_no already exists.")
    else:
        print(f"Error: {e}")
finally:
    conn.close()
