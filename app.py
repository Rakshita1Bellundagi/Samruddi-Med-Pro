from flask import Flask, request, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import func
from flask_cors import CORS
from werkzeug.utils import secure_filename
import os
import datetime

app = Flask(__name__, static_url_path='', static_folder='.')
CORS(app)

# Configuration
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'txt', 'pdf', 'png', 'jpg', 'jpeg', 'gif'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Ensure upload directories exist
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
if not os.path.exists(os.path.join(UPLOAD_FOLDER, 'bills')):
    os.makedirs(os.path.join(UPLOAD_FOLDER, 'bills'))

@app.post('/api/bills/pdf')
def upload_bill_pdf():
    if 'pdf' not in request.files:
        return jsonify({"success": False, "message": "No file part"}), 400
    file = request.files['pdf']
    filename = request.form.get('filename', "bill.pdf")
    
    if file:
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], 'bills', filename)
        file.save(filepath)
        # Use request.host_url to get full domain/port
        file_url = f"{request.host_url}uploads/bills/{filename}"
        return jsonify({"success": True, "url": file_url}), 201
    return jsonify({"success": False, "message": "Failed to upload"}), 400

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Routes to serve HTML pages
@app.route('/')
def index():
    return app.send_static_file('login.html')

@app.route('/<path:path>')
def serve_static(path):
    return app.send_static_file(path)

@app.route('/uploads/<name>')
def download_file(name):
    return send_from_directory(app.config['UPLOAD_FOLDER'], name)

# Database Configuration
db_path = os.path.join(os.path.abspath(os.path.dirname(__file__)), 'medical_shop.db')
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + db_path
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# Models
class AppUser(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password = db.Column(db.String(100), nullable=False)
    pharmacy_name = db.Column(db.String(100))
    role = db.Column(db.String(20), default='user')
    mobile = db.Column(db.String(20), unique=True, nullable=True)
    trusted_devices = db.Column(db.Text, default='[]') # JSON string of trusted device IDs
    otp = db.Column(db.String(10), default=None)
    otp_expiry = db.Column(db.DateTime, default=None)

class Medicine(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    salt = db.Column(db.String(200))
    batch_no = db.Column(db.String(50), unique=True, nullable=False)
    hsn_sac = db.Column(db.String(20), default='')
    mrp = db.Column(db.Float, default=0.0)
    quantity = db.Column(db.Integer, default=0)
    expiry_date = db.Column(db.String(20))
    mfg_date = db.Column(db.String(20))
    category = db.Column(db.String(50))
    
    # Backwards compatibility with previous "Inventory" naming
    @property
    def stock(self): return self.quantity
    @stock.setter
    def stock(self, value): self.quantity = value
    
    def to_dict(self):
        status = "Good"
        if self.quantity <= 0: status = "Out of Stock"
        elif self.quantity < 20: status = "Low Stock"
        return {
            "id": self.id,
            "name": self.name,
            "salt": self.salt,
            "batchNo": self.batch_no,
            "hsn_sac": self.hsn_sac,
            "mrp": self.mrp,
            "stock": self.quantity,
            "expiry": self.expiry_date,
            "mfg_date": self.mfg_date,
            "status": status,
            "type": self.category
        }

class Customer(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    mobile = db.Column(db.String(20))
    address = db.Column(db.Text, default='')
    gstin = db.Column(db.String(20), default='')
    total_spend = db.Column(db.Float, default=0.0)
    last_visit = db.Column(db.String(20))

class Bill(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    bill_no = db.Column(db.String(50), unique=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('customer.id'))
    bill_date = db.Column(db.String(20))
    subtotal = db.Column(db.Float, default=0.0)
    gst_amount = db.Column(db.Float, default=0.0)
    discount_amount = db.Column(db.Float, default=0.0)
    total_amount = db.Column(db.Float)
    payment_mode = db.Column(db.String(20))
    utr_number = db.Column(db.String(50))
    items = db.relationship('BillItem', backref='bill', lazy=True)

class BillItem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    bill_id = db.Column(db.Integer, db.ForeignKey('bill.id'))
    medicine_id = db.Column(db.Integer, db.ForeignKey('medicine.id'), nullable=True)
    medicine_name = db.Column(db.String(100)) # Snapshot name
    batch_no = db.Column(db.String(50))      # Snapshot batch
    hsn_sac = db.Column(db.String(20))
    mfg_date = db.Column(db.String(20))
    expiry_date = db.Column(db.String(20))
    quantity = db.Column(db.Integer)
    mrp = db.Column(db.Float)
    rate = db.Column(db.Float)
    discount_percent = db.Column(db.Float, default=0.0)
    taxable_value = db.Column(db.Float)
    total = db.Column(db.Float)
    s_no = db.Column(db.Integer, default=0)
    medicine = db.relationship('Medicine', backref='bill_items', lazy=True)

class Prescription(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(200), nullable=False)
    upload_date = db.Column(db.DateTime, default=datetime.datetime.now)
    customer_name = db.Column(db.String(100), default="Unknown")
    status = db.Column(db.String(20), default="Pending") # Pending, Processed
    notes = db.Column(db.Text)

# Create Database Tables
with app.app_context():
    db.create_all()

# --- API Endpoints ---

@app.get('/api/inventory')
def get_inventory():
    items = Medicine.query.all()
    return jsonify([it.to_dict() for it in items])

@app.post('/api/inventory/update')
def update_stock():
    data = request.json
    batchNo = data.get('batchNo')
    action = data.get('action')
    quantity = data.get('quantity', 10)

    item = Medicine.query.filter_by(batch_no=batchNo).first()
    if not item:
        return jsonify({"success": False, "message": "Item not found"}), 404

    if action == 'restock':
        item.quantity += quantity
    elif action == 'dispose':
        item.quantity = 0
    elif action == 'sale':
        if item.quantity >= quantity:
            item.quantity -= quantity
        else:
            return jsonify({"success": False, "message": "Insufficient stock"}), 400

    db.session.commit()
    return jsonify({"success": True, "message": "Stock updated", "item": item.to_dict()})

@app.post('/api/inventory/add')
def add_item():
    data = request.json
    try:
        new_item = Medicine(
            name=data['name'],
            batch_no=data['batchNo'],
            quantity=data.get('stock', 0),
            expiry_date=data['expiry'],
            category=data['type'],
            salt=data.get('salt', ''),
            mrp=data.get('mrp', 0.0)
        )
        db.session.add(new_item)
        db.session.commit()
        return jsonify({"success": True, "item": new_item.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 400

@app.patch('/api/inventory/<int:id>')
def update_medicine(id):
    data = request.json
    try:
        item = Medicine.query.get(id)
        if not item:
            return jsonify({"success": False, "message": "Item not found"}), 404
        
        if 'name' in data: item.name = data['name']
        if 'batchNo' in data: item.batch_no = data['batchNo']
        if 'stock' in data: item.quantity = data['stock']
        if 'expiry' in data: item.expiry_date = data['expiry']
        if 'type' in data: item.category = data['type']
        if 'mrp' in data: item.mrp = data['mrp']
        if 'salt' in data: item.salt = data['salt']
        
        db.session.commit()
        return jsonify({"success": True, "message": "Medicine updated"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 400

@app.delete('/api/inventory/<int:id>')
def delete_medicine(id):
    try:
        item = Medicine.query.get(id)
        if not item:
            return jsonify({"success": False, "message": "Item not found"}), 404
        
        db.session.delete(item)
        db.session.commit()
        return jsonify({"success": True, "message": "Medicine deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 400

@app.get('/api/customers')
def get_customers():
    customers = Customer.query.all()
    return jsonify([{
        "id": c.id,
        "name": c.name,
        "mobile": c.mobile,
        "address": c.address,
        "gstin": c.gstin,
        "total_spend": c.total_spend,
        "last_visit": c.last_visit
    } for c in customers])

@app.post('/api/customers')
def add_customer():
    data = request.json
    try:
        new_customer = Customer(
            name=data['name'],
            mobile=data.get('mobile', ''),
            total_spend=data.get('total_spend', 0.0),
            last_visit=data.get('last_visit', '')
        )
        db.session.add(new_customer)
        db.session.commit()
        return jsonify({"success": True, "id": new_customer.id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 400

@app.post('/api/bills')
def create_bill():
    data = request.json
    try:
        # Determine Bill Number (Sequential)
        if not data.get('bill_no') or 'BILL-' in data.get('bill_no', ''):
             last_bill = Bill.query.order_by(Bill.id.desc()).first()
             next_id = (last_bill.id + 1) if last_bill else 1
             bill_no = f"{next_id:04d}"
        else:
             bill_no = data['bill_no']

        new_bill = Bill(
            bill_no=bill_no,
            total_amount=data['total_amount'],
            subtotal=data.get('subtotal', 0.0),
            gst_amount=data.get('gst_amount', 0.0),
            discount_amount=data.get('discount_amount', 0.0),
            payment_mode=data.get('payment_mode', 'cash'),
            utr_number=data.get('utr_number', ''),
            bill_date=data.get('bill_date', ''),
            customer_id=data.get('customer_id') # Handle customer link
        )
        db.session.add(new_bill)
        
        # Update customer spend if customer_id provided
        if new_bill.customer_id:
            customer = Customer.query.get(new_bill.customer_id)
            if customer:
                customer.total_spend += new_bill.total_amount
                from datetime import date
                customer.last_visit = date.today().strftime('%d %b %Y')

        db.session.flush() # Get bill ID

        # Add items with sequential s_no
        for idx, item in enumerate(data.get('items', [])):
            bill_item = BillItem(
                bill_id=new_bill.id,
                s_no=idx + 1,
                medicine_id=item.get('id'),
                medicine_name=item.get('name', 'Unknown Item'),
                batch_no=item.get('batchNo', 'N/A'),
                hsn_sac=item.get('hsn_sac', ''),
                mfg_date=item.get('mfg_date', ''),
                expiry_date=item.get('expiry', ''),
                quantity=item['qty'],
                mrp=item.get('mrp', 0.0),
                rate=item.get('rate', 0.0),
                discount_percent=item.get('discount_percent', 0.0),
                taxable_value=item.get('taxable_value', 0.0),
                total=item['total']
            )
            db.session.add(bill_item)
        
        db.session.commit()
        return jsonify({"success": True, "id": new_bill.id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 400

@app.patch('/api/customers/<int:id>')
def update_customer(id):
    data = request.json
    try:
        customer = Customer.query.get(id)
        if not customer:
            return jsonify({"success": False, "message": "Customer not found"}), 404
        
        if 'name' in data: customer.name = data['name']
        if 'mobile' in data: customer.mobile = data['mobile']
        if 'address' in data: customer.address = data['address']
        if 'gstin' in data: customer.gstin = data['gstin']
        
        db.session.commit()
        return jsonify({"success": True, "message": "Customer updated"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 400

@app.delete('/api/customers/<int:id>')
def delete_customer(id):
    try:
        customer = Customer.query.get(id)
        if not customer:
            return jsonify({"success": False, "message": "Customer not found"}), 404
        
        db.session.delete(customer)
        db.session.commit()
        return jsonify({"success": True, "message": "Customer deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 400

@app.get('/api/bills/<int:bill_id>')
def get_bill(bill_id):
    bill = Bill.query.get(bill_id)
    if not bill:
        return jsonify({"success": False, "message": "Bill not found"}), 404
    
    customer = Customer.query.get(bill.customer_id) if bill.customer_id else None
    
    return jsonify({
        "success": True,
        "bill_no": bill.bill_no,
        "bill_date": bill.bill_date,
        "subtotal": bill.subtotal,
        "gst_amount": bill.gst_amount,
        "discount_amount": bill.discount_amount,
        "total_amount": bill.total_amount,
        "payment_mode": bill.payment_mode,
        "utr_number": bill.utr_number,
        "customer": {
            "name": customer.name if customer else "Walking Customer",
            "mobile": customer.mobile if customer else "N/A",
            "address": customer.address if customer else "N/A",
            "gstin": customer.gstin if customer else "N/A"
        },
        "items": [{
            "name": item.medicine_name or (item.medicine.name if item.medicine else "Unknown Item"),
            "batch_no": item.batch_no or (item.medicine.batch_no if item.medicine else "N/A"),
            "hsn_sac": item.hsn_sac or (item.medicine.hsn_sac if item.medicine else ""),
            "mfg_date": item.mfg_date or (item.medicine.mfg_date if item.medicine else ""),
            "expiry_date": item.expiry_date or (item.medicine.expiry_date if item.medicine else ""),
            "quantity": item.quantity,
            "mrp": item.mrp or (item.medicine.mrp if item.medicine else 0.0),
            "rate": item.rate or 0.0,
            "discount_percent": item.discount_percent or 0.0,
            "total": item.total,
            "s_no": item.s_no
        } for item in sorted(bill.items, key=lambda x: x.s_no or x.id)]
    })

@app.get('/api/bills/next-number')
def get_next_bill_number():
    last_bill = Bill.query.order_by(Bill.id.desc()).first()
    next_id = (last_bill.id + 1) if last_bill else 1
    return jsonify({"next_no": f"{next_id:04d}"})

@app.post('/api/login')
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    
    user = AppUser.query.filter_by(email=email, password=password).first()
    if user:
        return jsonify({
            "success": True, 
            "user": {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "role": user.role,
                "pharmacy_name": user.pharmacy_name
            }
        })
    else:
        return jsonify({"success": False, "message": "Invalid credentials"}), 401

@app.post('/api/register')
def register():
    data = request.json
    try:
        # Check if user already exists
        if AppUser.query.filter_by(email=data['email']).first():
            return jsonify({"success": False, "message": "User already exists"}), 400
            
        new_user = AppUser(
            name=data.get('name', 'Admin'),
            email=data['email'],
            password=data['password'],
            pharmacy_name=data.get('pharmacy_name', ''),
            role='admin'
        )
        db.session.add(new_user)
        db.session.commit()
        return jsonify({"success": True, "message": "Registration successful"}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 400

@app.get('/api/analytics/stats')
def get_dashboard_stats():
    from datetime import date
    # Match frontend format: 21/01/2026
    today_str = date.today().strftime('%d/%m/%Y')
    
    try:
        # Today's Sales (Using LIKE to match date part only, ignoring time)
        today_sales = db.session.query(func.sum(Bill.total_amount)).filter(Bill.bill_date.like(f"{today_str}%")).scalar() or 0
        
        # Total Bills
        total_bills = Bill.query.count()
        
        # Low Stock
        low_stock = Medicine.query.filter(Medicine.quantity < 20).count()
        
        # Expired (Simple date compare as string - YYYY-MM-DD)
        today_iso = date.today().strftime('%Y-%m-%d')
        expired = Medicine.query.filter(Medicine.expiry_date < today_iso).count()
        
        return jsonify({
            "today_sales": float(today_sales),
            "total_bills": total_bills,
            "low_stock": low_stock,
            "expired": expired
        })
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 400

@app.get('/api/analytics/top-selling')
def get_top_selling():
    try:
        top_selling = db.session.query(
            BillItem.medicine_id,
            Medicine.name,
            func.sum(BillItem.quantity).label('total_sold')
        ).join(Medicine, BillItem.medicine_id == Medicine.id)\
         .group_by(BillItem.medicine_id, Medicine.name)\
         .order_by(func.sum(BillItem.quantity).desc())\
         .limit(5).all()
        
        return jsonify([
            {"name": item.name, "sold": int(item.total_sold)} 
            for item in top_selling
        ])
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 400

@app.post('/api/prescriptions')
def upload_prescription():
    if 'file' not in request.files:
        return jsonify({"success": False, "message": "No file part"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"success": False, "message": "No selected file"}), 400
    
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        # Add timestamp to filename to prevent duplicates
        timestamp = datetime.datetime.now().strftime("%Y%m%d%H%M%S")
        filename = f"{timestamp}_{filename}"
        
        file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
        
        new_rx = Prescription(
            filename=filename,
            customer_name=request.form.get('customerName', 'Unknown')
        )
        db.session.add(new_rx)
        db.session.commit()
        
        return jsonify({"success": True, "message": "File uploaded successfully"}), 201
    else:
        return jsonify({"success": False, "message": "File type not allowed"}), 400

@app.get('/api/prescriptions')
def get_prescriptions():
    prescriptions = Prescription.query.order_by(Prescription.upload_date.desc()).all()
    return jsonify([{
        "id": rx.id,
        "filename": rx.filename,
        "upload_date": rx.upload_date.strftime("%Y-%m-%d %H:%M"),
        "customer_name": rx.customer_name,
        "status": rx.status,
        "url": f"/uploads/{rx.filename}"
    } for rx in prescriptions])


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)
