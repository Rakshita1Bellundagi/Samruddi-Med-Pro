// Inventory Logic for SAMRUDDI MEDICAL SHOP
// Connects to Flask/SQL backend via DB (js/db.js)

document.addEventListener('DOMContentLoaded', () => {
    console.log('Inventory System Initialized');

    const inventoryTableBody = document.getElementById('inventory-table-body');
    const addMedicineForm = document.getElementById('addMedicineForm');

    async function loadInventory() {
        try {
            const items = await DB.getInventory();
            window.allInventory = items; // Store for editing
            applyFilters(); // Apply initial filters (which will be 'all' by default)
        } catch (error) {
            console.error('Error loading inventory:', error);
        }
    }

    // Filter Logic
    const searchInput = document.getElementById('inventorySearch');
    const filterStock = document.getElementById('filterStock');
    const filterExpiry = document.getElementById('filterExpiry');

    function applyFilters() {
        if (!window.allInventory) return;

        const query = searchInput.value.toLowerCase();
        const stockStatus = filterStock.value;
        const expiryStatus = filterExpiry.value;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const filtered = window.allInventory.filter(item => {
            // 1. Search Filter
            const matchesSearch = item.name.toLowerCase().includes(query) ||
                item.batchNo.toLowerCase().includes(query);
            if (!matchesSearch) return false;

            // 2. Stock Filter
            if (stockStatus === 'out_of_stock' && item.stock > 0) return false;
            // Strict low stock: > 0 AND < 20
            if (stockStatus === 'low_stock' && (item.stock <= 0 || item.stock >= 20)) return false;

            // 3. Expiry Filter
            if (expiryStatus !== 'all') {
                const itemDate = new Date(item.expiry);
                // Difference in days
                const diffTime = itemDate - today;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (expiryStatus === 'expired') {
                    if (diffDays >= 0) return false; // Not expired yet
                } else if (expiryStatus === 'exp_30') {
                    // Expiring in next 30 days (so from today(0) to 30)
                    if (diffDays < 0 || diffDays > 30) return false;
                } else if (expiryStatus === 'exp_60') {
                    // Expiring in next 60 days
                    if (diffDays < 0 || diffDays > 60) return false;
                }
            }

            return true;
        });

        renderInventory(filtered);
    }

    // Event Listeners for Filters
    if (searchInput) searchInput.addEventListener('input', applyFilters);
    if (filterStock) filterStock.addEventListener('change', applyFilters);
    if (filterExpiry) filterExpiry.addEventListener('change', applyFilters);

    function renderInventory(items) {
        inventoryTableBody.innerHTML = '';

        items.forEach(item => {
            const tr = document.createElement('tr');

            // Determine classes based on status
            if (item.status === 'Out of Stock') tr.classList.add('stock-critical');
            else if (item.status === 'Low Stock') tr.classList.add('stock-low');

            // Icon selection
            let icon = 'fa-pills';
            if (item.type === 'tablets') icon = 'fa-tablets';
            if (item.type === 'capsules') icon = 'fa-capsules';
            if (item.type === 'eye-dropper') icon = 'fa-eye-dropper';

            // Badge color
            let badgeClass = 'bg-success';
            if (item.status === 'Out of Stock') badgeClass = 'bg-danger';
            else if (item.status === 'Low Stock') badgeClass = 'bg-warning text-dark';

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
                <td><span class="fw-bold ${item.stock <= 0 ? 'text-danger' : (item.stock < 20 ? 'text-warning-emphasis' : '')}">${item.stock}</span></td>
                <td>${item.expiry}</td>
                <td>${item.mrp.toFixed(2)}</td>
                <td><span class="badge ${badgeClass} rounded-pill">${item.status}</span></td>
                <td>
                    <button class="btn btn-sm btn-primary me-1" onclick="restockItem('${item.batchNo}')">Restock</button>
                    <button class="btn btn-sm btn-outline-warning" onclick="editItem(${item.id})"><i class="fas fa-edit"></i></button>
                </td>
            `;
            inventoryTableBody.appendChild(tr);
        });
    }

    // Handle Form Submission
    if (addMedicineForm) {
        addMedicineForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(addMedicineForm);
            const data = Object.fromEntries(formData.entries());

            // Process numeric values
            data.stock = parseInt(data.stock);
            data.mrp = parseFloat(data.mrp);

            const mode = addMedicineForm.dataset.mode;
            const currentId = mode === 'edit' ? parseInt(addMedicineForm.dataset.id) : null;

            // Check for duplicates (Name + BatchNo combination)
            const isDuplicate = window.allInventory.some(m =>
                m.name.toLowerCase() === data.name.toLowerCase() &&
                m.batchNo.toLowerCase() === data.batchNo.toLowerCase() &&
                m.id !== currentId
            );

            if (isDuplicate) {
                alert(`Error: Medicine "${data.name}" with Batch No "${data.batchNo}" is already available!`);
                return;
            }

            // Expiry Date Validation (Upcoming dates only)
            const expiryDate = new Date(data.expiry);
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Set to start of today

            if (expiryDate <= today) {
                alert("Error: Expiry date must be a future date (it cannot be today or in the past).");
                return;
            }

            let result;
            if (addMedicineForm.dataset.mode === 'edit') {
                const id = parseInt(addMedicineForm.dataset.id);
                result = await DB.updateMedicine(id, data);
            } else {
                result = await DB.addMedicine(data);
            }

            if (result.success) {
                alert(addMedicineForm.dataset.mode === 'edit' ? 'Medicine updated!' : 'Medicine added!');
                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('addMedicineModal'));
                if (modal) modal.hide();
                resetMedicineForm();
                loadInventory(); // Refresh table
            } else {
                alert('Error: ' + result.message);
            }
        });
    }

    function resetMedicineForm() {
        addMedicineForm.reset();
        delete addMedicineForm.dataset.mode;
        delete addMedicineForm.dataset.id;
        const submitBtn = addMedicineForm.parentElement.parentElement.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.innerText = 'Add to Inventory';
        const title = document.querySelector('#addMedicineModal .modal-title');
        if (title) title.innerText = 'Add New Medicine to Inventory';
    }

    // Reset form when modal closed
    document.getElementById('addMedicineModal').addEventListener('hidden.bs.modal', resetMedicineForm);

    window.editItem = (id) => {
        const item = window.allInventory.find(it => it.id === id);
        if (!item) return;

        addMedicineForm.dataset.mode = 'edit';
        addMedicineForm.dataset.id = id;
        addMedicineForm.name.value = item.name;
        addMedicineForm.batchNo.value = item.batchNo;
        addMedicineForm.stock.value = item.stock;
        addMedicineForm.mrp.value = item.mrp;
        addMedicineForm.expiry.value = item.expiry;
        addMedicineForm.type.value = item.type;

        const modalElement = document.getElementById('addMedicineModal');
        const modal = new bootstrap.Modal(modalElement);
        document.querySelector('#addMedicineModal .modal-title').innerText = 'Edit Medicine Details';
        document.querySelector('#addMedicineModal button[type="submit"]').innerText = 'Update Medicine';
        modal.show();
    };

    // Export Functionality
    const exportBtn = document.getElementById('exportInventoryBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            if (!window.allInventory || window.allInventory.length === 0) {
                alert('No data to export!');
                return;
            }

            // Define CSV Headers
            const headers = ['ID', 'Medicine Name', 'Batch No', 'Stock', 'Expiry', 'MRP', 'Category', 'Status'];

            // Map data to CSV rows
            const rows = window.allInventory.map(item => [
                item.id,
                `"${item.name}"`, // Quote strings with commas
                item.batchNo,
                item.stock,
                item.expiry,
                item.mrp,
                item.type,
                item.status
            ]);

            // Combine headers and rows
            const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

            // Create download link
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', `inventory_export_${new Date().toISOString().slice(0, 10)}.csv`);
            link.style.visibility = 'hidden';

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }

    // Global helper for restock since it's called from onclick in HTML string
    window.restockItem = async (batchNo) => {
        const qty = prompt("Enter quantity to restock:", "50");
        if (qty === null || isNaN(qty)) return;

        const result = await DB.updateStock(batchNo, 'restock', parseInt(qty));
        if (result.success) {
            loadInventory();
        } else {
            alert('Failed to restock: ' + result.message);
        }
    };

    // Initial load
    loadInventory();
});
