from app import app, db, Medicine
with app.app_context():
    items = Medicine.query.all()
    for item in items:
        print(f"ID: {item.id}, Name: {item.name}, Batch: {item.batch_no}, MRP: {item.mrp}")
