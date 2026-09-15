from app import app, db, Medicine, BillItem
with app.app_context():
    bad_items = Medicine.query.filter(Medicine.name == None).all()
    print(f"Medicines with null name: {len(bad_items)}")
    
    empty_items = Medicine.query.filter(Medicine.name == '').all()
    print(f"Medicines with empty name: {len(empty_items)}")

    # Check BillItems
    bill_items = BillItem.query.all()
    for bi in bill_items:
        if bi.medicine is None:
            print(f"BillItem {bi.id} has no medicine relation! Medicine ID: {bi.medicine_id}")
