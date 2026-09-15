// Main Script
document.addEventListener('DOMContentLoaded', () => {
    console.log('Pharmacy App Loaded');

    const inventoryTableBody = document.getElementById('inventory-table-body');

    if (inventoryTableBody) {
        fetchInventory();
    }
});

async function fetchInventory() {
    try {
        const response = await fetch('/api/inventory');
        const data = await response.json();
        renderInventory(data);
    } catch (error) {
        console.error('Error fetching inventory:', error);
    }
}

function renderInventory(items) {
    const tbody = document.getElementById('inventory-table-body');
    tbody.innerHTML = '';

    items.forEach(item => {
        const tr = document.createElement('tr');

        // Determine class based on status
        if (item.status === 'Out of Stock') tr.classList.add('stock-critical');
        else if (item.status === 'Low Stock') tr.classList.add('stock-low');
        else if (item.status === 'Expiring Soon') tr.classList.add('stock-expiring');

        // Determine icon
        let icon = 'fa-pills';
        if (item.type === 'tablets') icon = 'fa-tablets';
        if (item.type === 'capsules') icon = 'fa-capsules';
        if (item.type === 'eye-dropper') icon = 'fa-eye-dropper';

        // Determine badge color
        let badgeClass = 'bg-success';
        if (item.status === 'Out of Stock') badgeClass = 'bg-danger';
        if (item.status === 'Low Stock') badgeClass = 'bg-warning text-dark';
        if (item.status === 'Expiring Soon') badgeClass = 'bg-warning text-dark';

        // Determine action button
        let actionBtn = `<button class="btn btn-sm btn-outline-primary">History</button>`;
        if (item.status === 'Out of Stock' || item.status === 'Low Stock') {
            actionBtn = `<button class="btn btn-sm btn-primary" onclick="restockItem('${item.batchNo}')">Restock</button>`;
        } else if (item.status === 'Expiring Soon') {
            actionBtn = `<button class="btn btn-sm btn-outline-danger" onclick="disposeItem('${item.batchNo}')">Dispose</button>`;
        }

        tr.innerHTML = `
            <td class="fw-bold">
                <div class="d-flex align-items-center">
                    <div class="bg-white p-1 rounded border me-2">
                        <i class="fas ${icon} text-muted"></i>
                    </div>
                    ${item.name}
                </div>
            </td>
            <td>${item.batchNo}</td>
            <td><span class="fw-bold ${item.stock === 0 ? 'text-danger' : (item.stock < 20 ? 'text-warning-emphasis' : '')}">${item.stock}</span></td>
            <td>${item.expiry}</td>
            <td><span class="badge ${badgeClass} rounded-pill">${item.status}</span></td>
            <td>${actionBtn}</td>
        `;
        tbody.appendChild(tr);
    });
}

async function restockItem(batchNo) {
    if (!confirm('Restock this item?')) return;
    try {
        const response = await fetch('/api/inventory/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ batchNo, action: 'restock' })
        });
        const result = await response.json();
        if (result.success) {
            fetchInventory(); // Refresh table
        }
    } catch (error) {
        console.error('Error restocking:', error);
    }
}

async function disposeItem(batchNo) {
    if (!confirm('Dispose this item?')) return;
    try {
        const response = await fetch('/api/inventory/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ batchNo, action: 'dispose' })
        });
        const result = await response.json();
        if (result.success) {
            fetchInventory(); // Refresh table
        }
    } catch (error) {
        console.error('Error disposing:', error);
    }
}
