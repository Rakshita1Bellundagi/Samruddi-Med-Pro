const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'data', 'inventory.json');

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname)); // Serve static files (HTML, CSS, JS)

// Function to read data
const readData = () => {
    try {
        if (!fs.existsSync(DATA_FILE)) {
            return [];
        }
        const jsonData = fs.readFileSync(DATA_FILE);
        return JSON.parse(jsonData);
    } catch (err) {
        console.error("Error reading data:", err);
        return [];
    }
};

// Function to write data
const writeData = (data) => {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error("Error writing data:", err);
    }
};

// --- API Endpoints ---

// Get all inventory
app.get('/api/inventory', (req, res) => {
    const inventory = readData();
    res.json(inventory);
});

// Update stock (Restock or Dispose)
app.post('/api/inventory/update', (req, res) => {
    const { batchNo, action, quantity } = req.body; // action: 'restock', 'dispose', 'sale'
    let inventory = readData();
    let itemIndex = inventory.findIndex(item => item.batchNo === batchNo);

    if (itemIndex > -1) {
        if (action === 'restock') {
            inventory[itemIndex].stock += (quantity || 10); // Default restock amount
            inventory[itemIndex].status = inventory[itemIndex].stock > 0 ? (inventory[itemIndex].stock < 20 ? 'Low Stock' : 'Good') : 'Out of Stock';
        } else if (action === 'dispose') {
            inventory[itemIndex].stock = 0;
            inventory[itemIndex].status = 'Out of Stock'; // Or 'Disposed'
        }

        writeData(inventory);
        res.json({ success: true, message: 'Stock updated', item: inventory[itemIndex] });
    } else {
        res.status(404).json({ success: false, message: 'Item not found' });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Open your browser and visit http://localhost:${PORT}/inventory.html`);
});
