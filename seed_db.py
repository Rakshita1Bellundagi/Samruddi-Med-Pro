import json
import os
from app import app, db, Medicine, Customer, AppUser

def seed_database():
    json_path = os.path.join('data', 'inventory.json')
    
    if not os.path.exists(json_path):
        print(f"Error: {json_path} not found.")
        return

    with open(json_path, 'r') as f:
        data = json.load(f)

    with app.app_context():
        # 1. Seed Medicines
        for item in data:
            existing = Medicine.query.filter_by(batch_no=item['batchNo']).first()
            if existing:
                existing.mrp = item.get('mrp', 0.0)
                existing.salt = item.get('salt', '')
                print(f"Updating Medicine: {item['name']} price...")
            else:
                new_item = Medicine(
                    name=item['name'],
                    batch_no=item['batchNo'],
                    quantity=item['stock'],
                    expiry_date=item['expiry'],
                    category=item['type'],
                    mrp=item.get('mrp', 0.0),
                    salt=item.get('salt', '')
                )
                db.session.add(new_item)
                print(f"Adding Medicine: {item['name']}...")
        
        # 2. Seed Customers
        customers_data = [
            {"name": "Rajesh Kumar", "mobile": "9876543210", "total_spend": 8500.0, "last_visit": "12 Jan 2026"},
            {"name": "Anita Singh", "mobile": "9123456780", "total_spend": 12050.0, "last_visit": "15 Jan 2026"},
            {"name": "Suresh Raina", "mobile": "9988776655", "total_spend": 3200.0, "last_visit": "18 Jan 2026"},
            {"name": "Sneha Patel", "mobile": "9876543211", "total_spend": 4500.0, "last_visit": "20 Jan 2026"},
            {"name": "Vikram Malhotra", "mobile": "9876543212", "total_spend": 6700.0, "last_visit": "19 Jan 2026"},
            {"name": "Pooja Hegde", "mobile": "9876543213", "total_spend": 8900.0, "last_visit": "10 Jan 2026"},
            {"name": "Rahul Dravid", "mobile": "9876543214", "total_spend": 15000.0, "last_visit": "05 Jan 2026"},
            {"name": "Priya Sharma", "mobile": "9876543215", "total_spend": 2300.0, "last_visit": "21 Jan 2026"},
            {"name": "Walking Customer", "mobile": "0000000000", "total_spend": 0.0, "last_visit": "N/A"}
        ]
        
        for c_data in customers_data:
            existing = Customer.query.filter_by(mobile=c_data['mobile']).first()
            if not existing:
                new_customer = Customer(**c_data)
                db.session.add(new_customer)
                print(f"Adding Customer: {c_data['name']}...")
            else:
                # Update existing customer spend
                existing.total_spend = c_data['total_spend']
                existing.last_visit = c_data['last_visit']
                print(f"Updating Customer: {c_data['name']}...")
        
        # 3. Seed Users
        admin_email = "admin@meditech.com"
        admin_user = AppUser.query.filter_by(email=admin_email).first()
        if not admin_user:
            new_admin = AppUser(
                name="Admin",
                email=admin_email,
                password="admin123", # Note: Should be hashed in production
                pharmacy_name="SAMRUDDI MEDICAL SHOP",
                role="admin"
            )
            db.session.add(new_admin)
            print(f"Adding Admin User: {admin_email}...")
        else:
            print(f"Admin User {admin_email} already exists.")

        db.session.commit()
        print("Success: Database seeded comprehensively.")

if __name__ == '__main__':
    seed_database()
