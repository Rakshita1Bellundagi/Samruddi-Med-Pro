// Database Connection Bridge to Flask Backend
// This file connects the frontend to the real SQL database via the Flask API

const API_BASE_URL = 'http://localhost:5001/api';

const DB = {
    // Inventory / Medicine Operations
    async getInventory() {
        try {
            const response = await fetch(`${API_BASE_URL}/inventory`);
            return await response.json();
        } catch (error) {
            console.error('Error fetching inventory:', error);
            return [];
        }
    },

    async updateStock(batchNo, action, quantity = 10) {
        try {
            const response = await fetch(`${API_BASE_URL}/inventory/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ batchNo, action, quantity })
            });
            return await response.json();
        } catch (error) {
            console.error('Error updating stock:', error);
            return { success: false, message: 'Network error' };
        }
    },

    async addMedicine(medicineData) {
        try {
            const response = await fetch(`${API_BASE_URL}/inventory/add`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(medicineData)
            });
            return await response.json();
        } catch (error) {
            console.error('Error adding medicine:', error);
            return { success: false, message: 'Network error' };
        }
    },

    async updateMedicine(id, medicineData) {
        try {
            const response = await fetch(`${API_BASE_URL}/inventory/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(medicineData)
            });
            return await response.json();
        } catch (error) {
            console.error('Error updating medicine:', error);
            return { success: false, message: 'Network error' };
        }
    },

    async deleteMedicine(id) {
        try {
            const response = await fetch(`${API_BASE_URL}/inventory/${id}`, {
                method: 'DELETE'
            });
            return await response.json();
        } catch (error) {
            console.error('Error deleting medicine:', error);
            return { success: false, message: 'Network error' };
        }
    },

    // Customer Operations
    async getCustomers() {
        try {
            const response = await fetch(`${API_BASE_URL}/customers`);
            return await response.json();
        } catch (error) {
            console.error('Error fetching customers:', error);
            return [];
        }
    },

    async addCustomer(customerData) {
        try {
            const response = await fetch(`${API_BASE_URL}/customers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(customerData)
            });
            return await response.json();
        } catch (error) {
            console.error('Error adding customer:', error);
            return { success: false, message: 'Network error' };
        }
    },

    async updateCustomer(id, customerData) {
        try {
            const response = await fetch(`${API_BASE_URL}/customers/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(customerData)
            });
            return await response.json();
        } catch (error) {
            console.error('Error updating customer:', error);
            return { success: false, message: 'Network error' };
        }
    },

    async deleteCustomer(id) {
        try {
            const response = await fetch(`${API_BASE_URL}/customers/${id}`, {
                method: 'DELETE'
            });
            return await response.json();
        } catch (error) {
            console.error('Error deleting customer:', error);
            return { success: false, message: 'Network error' };
        }
    },

    // Billing Operations
    async getBill(billId) {
        try {
            const response = await fetch(`${API_BASE_URL}/bills/${billId}`);
            return await response.json();
        } catch (error) {
            console.error('Error fetching bill:', error);
            return { success: false, message: 'Network error' };
        }
    },

    async createBill(billData) {
        try {
            const response = await fetch(`${API_BASE_URL}/bills`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(billData)
            });
            return await response.json();
        } catch (error) {
            console.error('Error creating bill:', error);
            return { success: false, message: 'Network error' };
        }
    },

    async saveBillPDF(pdfBlob, filename) {
        try {
            const formData = new FormData();
            formData.append('pdf', pdfBlob);
            formData.append('filename', filename);

            const response = await fetch(`${API_BASE_URL}/bills/pdf`, {
                method: 'POST',
                body: formData
            });
            return await response.json();
        } catch (error) {
            console.error('Error uploading PDF:', error);
            return { success: false, message: 'Network error' };
        }
    }
};

// Legacy support for runSQL if needed by other components
async function runSQL(query, params) {
    console.warn("Direct SQL execution on frontend is deprecated. Use DB helper functions instead.");
    return [];
}

console.log("Database Connectivity Initialized (Flask API Bridge)");
