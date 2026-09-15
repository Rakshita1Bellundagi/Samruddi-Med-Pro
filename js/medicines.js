// Medicine Management Logic for SAMRUDDI MEDICAL SHOP
// Connects to Flask/SQL backend via DB (js/db.js)

document.addEventListener('DOMContentLoaded', () => {
    console.log('Medicine Management Initialized');

    const medicineTableBody = document.getElementById('medicine-table-body');
    const addMedicineForm = document.querySelector('#addMedicineModal form');
    const saveBtn = document.querySelector('#addMedicineModal .btn-primary');
    const idInput = addMedicineForm.querySelector('input[name="id"]');
    const nameInput = addMedicineForm.querySelector('input[name="name"]');
    const saltInput = addMedicineForm.querySelector('input[name="salt"]');
    const categorySelect = addMedicineForm.querySelector('select');
    const modalTitle = document.querySelector('#addMedicineModal .modal-title');
    const addBtn = document.querySelector('[data-bs-target="#addMedicineModal"]');



    let allMedicines = [];

    async function loadMedicines() {
        try {
            const items = await DB.getInventory();
            allMedicines = items;
            renderMedicines(items);
        } catch (error) {
            console.error('Error loading medicines:', error);
        }
    }

    function renderMedicines(items) {
        medicineTableBody.innerHTML = '';

        items.forEach(item => {
            const tr = document.createElement('tr');

            tr.innerHTML = `
                <td class="fw-bold">${item.name}</td>
                <td class="text-muted small">${item.salt || 'N/A'}</td>
                <td>${item.batchNo}</td>
                <td><span class="badge ${item.stock > 20 ? 'bg-success' : 'bg-warning text-dark'}">${item.stock} Units</span></td>
                <td>${item.expiry}</td>
                <td class="fw-bold text-success">₹ ${item.mrp.toFixed(2)}</td>
                <td>
                    <button class="btn btn-sm btn-outline-success me-1" onclick="addToBill(${JSON.stringify(item).replace(/"/g, '&quot;')})">
                        <i class="fas fa-file-invoice-dollar"></i> Bill
                    </button>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="editMedicine(${JSON.stringify(item).replace(/"/g, '&quot;')})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteMedicine(${item.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            medicineTableBody.appendChild(tr);
        });
    }

    // Handle Save Button Click
    // Handle Save Button Click (Add or Update)
    saveBtn.addEventListener('click', async () => {
        const formData = new FormData(addMedicineForm);
        const data = Object.fromEntries(formData.entries());

        // Ensure numeric types
        data.mrp = parseFloat(data.mrp) || 0;
        data.stock = parseInt(data.stock) || 0;

        const id = idInput.value;

        if (!data.name || !data.batchNo) {
            alert("Please fill in required fields.");
            return;
        }

        // Check for duplicates (Name + BatchNo combination)
        const isDuplicate = allMedicines.some(m =>
            m.name.toLowerCase() === data.name.toLowerCase() &&
            m.batchNo.toLowerCase() === data.batchNo.toLowerCase() &&
            m.id != id // Exclude current medicine if we are editing
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
        if (id) {
            result = await DB.updateMedicine(id, data);
        } else {
            result = await DB.addMedicine(data);
        }

        if (result.success) {
            alert(id ? 'Medicine updated successfully!' : 'Medicine added successfully!');
            const modal = bootstrap.Modal.getInstance(document.getElementById('addMedicineModal'));
            modal.hide();
            addMedicineForm.reset();
            idInput.value = ''; // Clear ID
            loadMedicines();
        } else {
            alert('Error: ' + result.message);
        }
    });

    // Reset Modal for "Add Medicine"
    addBtn.addEventListener('click', () => {
        addMedicineForm.reset();
        idInput.value = '';
        modalTitle.innerText = 'Add New Medicine';
        saveBtn.innerText = 'Save Medicine';
    });

    // Edit Medicine Function
    window.editMedicine = (item) => {
        idInput.value = item.id;
        nameInput.value = item.name;
        // Need to fill other fields correctly. 
        // We need to access inputs by their "position" or logic since they don't have names.
        // Re-selecting based on structure is safest.
        addMedicineForm.batchNo.value = item.batchNo;
        addMedicineForm.mrp.value = item.mrp;
        addMedicineForm.stock.value = item.stock;
        addMedicineForm.expiry.value = item.expiry;
        addMedicineForm.type.value = item.type; // Select

        modalTitle.innerText = 'Edit Medicine';
        saveBtn.innerText = 'Update Medicine';

        const modal = new bootstrap.Modal(document.getElementById('addMedicineModal'));
        modal.show();
    };

    // Delete Medicine Function
    window.deleteMedicine = async (id) => {
        if (confirm('Are you sure you want to delete this medicine?')) {
            const result = await DB.deleteMedicine(id);
            if (result.success) {
                // alert('Medicine deleted successfully');
                loadMedicines();
            } else {
                alert('Error deleting medicine: ' + result.message);
            }
        }
    };

    // --- Pending Billing Logic ---
    window.addToBill = (item) => {
        let pending = JSON.parse(sessionStorage.getItem('pendingBill') || '[]');

        // Add item to pending list
        pending.push({
            id: item.id,
            name: item.name,
            batchNo: item.batchNo,
            expiry: item.expiry,
            mrp: item.mrp,
            qty: 1 // Default to 1
        });

        sessionStorage.setItem('pendingBill', JSON.stringify(pending));
        updateBillBadge();

        // Simple visual feedback
        alert(`${item.name} added to pending bill. Go to Billing page to finalize.`);
    };

    function updateBillBadge() {
        const pending = JSON.parse(sessionStorage.getItem('pendingBill') || '[]');
        let badge = document.getElementById('billing-badge');

        if (!badge) {
            badge = document.createElement('div');
            badge.id = 'billing-badge';
            badge.className = 'position-fixed bottom-0 end-0 m-4 p-3 bg-success text-white rounded-pill shadow-lg cursor-pointer';
            badge.style.zIndex = '1050';
            badge.innerHTML = `<i class="fas fa-file-invoice-dollar me-2"></i> <span id="badge-count">0</span> Items in Bill <button class="btn btn-sm btn-light ms-2">Go to Billing</button>`;
            badge.onclick = () => window.location.href = 'billing.html';
            document.body.appendChild(badge);
        }

        document.getElementById('badge-count').innerText = pending.length;
        badge.style.display = pending.length > 0 ? 'block' : 'none';
    }

    // Initial load
    loadMedicines();
    updateBillBadge();


});
