import sqlite3
import os

db_path = os.path.join(os.path.abspath(os.path.dirname(__file__)), 'medical_shop.db')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

def add_column(table, column, type_def):
    try:
        print(f"Adding column {column} to {table}...")
        cursor.execute(f"ALTER TABLE {table} ADD COLUMN {column} {type_def};")
        conn.commit()
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e).lower():
            print(f"Column {column} in {table} already exists.")
        else:
            print(f"Error adding {column} to {table}: {e}")

# Medicine table
add_column("medicine", "hsn_sac", "VARCHAR(20) DEFAULT ''")
add_column("medicine", "mfg_date", "VARCHAR(20) DEFAULT ''")

# Customer table
add_column("customer", "address", "TEXT DEFAULT ''")
add_column("customer", "gstin", "VARCHAR(20) DEFAULT ''")

# Bill table
add_column("bill", "subtotal", "FLOAT DEFAULT 0.0")
add_column("bill", "gst_amount", "FLOAT DEFAULT 0.0")
add_column("bill", "discount_amount", "FLOAT DEFAULT 0.0")

# BillItem table
add_column("bill_item", "hsn_sac", "VARCHAR(20)")
add_column("bill_item", "mfg_date", "VARCHAR(20)")
add_column("bill_item", "expiry_date", "VARCHAR(20)")
add_column("bill_item", "mrp", "FLOAT")
add_column("bill_item", "rate", "FLOAT")
add_column("bill_item", "discount_percent", "FLOAT DEFAULT 0.0")
add_column("bill_item", "taxable_value", "FLOAT")

conn.close()
print("Migration completed.")
