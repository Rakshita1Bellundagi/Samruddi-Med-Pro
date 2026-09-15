import sqlite3
import os

db_path = os.path.join(os.path.abspath(os.path.dirname(__file__)), 'medical_shop.db')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    print("Adding columns to bill_item table...")
    cursor.execute("ALTER TABLE bill_item ADD COLUMN medicine_name VARCHAR(100);")
    cursor.execute("ALTER TABLE bill_item ADD COLUMN batch_no VARCHAR(50);")
    conn.commit()
    print("Columns added successfully.")
except sqlite3.OperationalError as e:
    if "duplicate column name" in str(e).lower():
        print("Columns already exist.")
    else:
        print(f"Error: {e}")
finally:
    conn.close()
