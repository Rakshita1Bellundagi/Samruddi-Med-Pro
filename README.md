# Samruddi-Med-Pro

Samruddi-Med-Pro is a comprehensive Pharmacy and Medical Store Management System designed to streamline daily operations. Built with a Flask backend and a modern web frontend, it provides an all-in-one solution for inventory management, billing, customer relationship management, and prescription tracking.

## Features

- **Dashboard & Analytics:** Get a quick overview of today's sales, total bills, low-stock items, and expired medicines.
- **Inventory Management:** 
  - Add, update, and remove medicines.
  - Track stock levels, batch numbers, MRP, and manufacturing/expiry dates.
  - Automatically updates stock status (e.g., "Low Stock", "Out of Stock").
- **Billing System:**
  - Generate new bills for walking or registered customers.
  - Calculate subtotals, GST, discounts, and total amounts.
  - Upload and link PDF bills.
- **Customer Management:** Keep track of customer information, visit history, and total spending.
- **Prescription Uploads:** Upload and manage customer prescriptions easily.
- **User Authentication:** Secure login and registration for administrators and staff.

## Technology Stack

- **Backend:** Python, Flask, Flask-SQLAlchemy, Flask-CORS
- **Database:** SQLite (SQLAlchemy ORM)
- **Frontend:** HTML, CSS, JavaScript
- **API:** RESTful endpoints to connect the frontend to the backend services.

## Prerequisites

- Python 3.x
- pip (Python package installer)

## Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Rakshita1Bellundagi/Samruddi-Med-Pro.git
   cd Samruddi-Med-Pro
   ```

2. **Install dependencies:**
   Ensure you are in the project directory, then install the required Python packages:
   ```bash
   pip install -r requirements.txt
   ```
   *(Note: The main dependencies include `Flask`, `Flask-SQLAlchemy`, `Flask-CORS`, and `Werkzeug`.)*

3. **Database Initialization:**
   The SQLite database (`medical_shop.db`) is automatically created when you run the application for the first time if it does not already exist. 

4. **Run the Application:**
   Start the Flask server by running:
   ```bash
   python app.py
   ```
   Alternatively, you can use the provided batch script if on Windows:
   ```bash
   start.bat
   ```

5. **Access the Application:**
   Open your web browser and navigate to:
   ```
   http://localhost:5001/
   ```

## Folder Structure

- `app.py`: Main Flask application file containing all routes and database models.
- `medical_shop.db`: SQLite database file (generated upon running).
- `uploads/`: Directory for storing uploaded prescriptions and bills.
- `css/`, `js/`, `img/`: Directories containing static frontend assets.
- `*.html`: Frontend views (e.g., `dashboard.html`, `billing.html`, `inventory.html`, `login.html`).

## License

This project is for educational and commercial use. 