import sqlite3
import os

db_path = 'medical_shop.db'

if not os.path.exists(db_path):
    print("Database not found. It will be created when the app starts.")
else:
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check columns in app_user
        cursor.execute("PRAGMA table_info(app_user)")
        columns = [info[1] for info in cursor.fetchall()]
        
        if 'mobile' not in columns:
            print("Adding 'mobile' column to app_user...")
            cursor.execute("ALTER TABLE app_user ADD COLUMN mobile VARCHAR(20)")
            conn.commit()
            print("Mobile column added.")
        else:
            print("'mobile' already exists.")
            
        # Update Admin User Mobile
        admin_email = "admin@meditech.com"
        target_mobile = "6360246268"
        
        # Check if admin exists
        cursor.execute("SELECT id FROM app_user WHERE email=?", (admin_email,))
        row = cursor.fetchone()
        
        if row:
            print(f"Updating mobile for {admin_email} to {target_mobile}...")
            cursor.execute("UPDATE app_user SET mobile=? WHERE email=?", (target_mobile, admin_email))
            conn.commit()
            print("Admin mobile updated successfully.")
        else:
            print("Admin user not found, skipping mobile update.")
            
        conn.close()
    except Exception as e:
        print(f"Error updating database: {e}")
