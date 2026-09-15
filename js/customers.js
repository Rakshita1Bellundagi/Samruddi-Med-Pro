// Customer Management Logic for SAMRUDDI MEDICAL SHOP
// Connects to Flask/SQL backend via DB (js/db.js)

document.addEventListener('DOMContentLoaded', () => {
    console.log('Customer Management Initialized');

    const customerTableBody = document.querySelector('tbody');
    const searchInput = document.querySelector('input[placeholder*="Search"]');
    const addCustomerForm = document.getElementById('addCustomerForm');

    async function loadCustomers() {
        try {
            const customers = await DB.getCustomers();
            window.allCustomers = customers; // Store globally for filtering
            renderCustomers(customers);
        } catch (error) {
            console.error('Error loading customers:', error);
        }
    }

    function renderCustomers(customers) {
        customerTableBody.innerHTML = '';

        customers.forEach(customer => {
            const tr = document.createElement('tr');

            // Generate Initials
            const initials = customer.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

            tr.innerHTML = `
                <td>
                    <div class="d-flex align-items-center">
                        <div class="bg-primary-subtle text-primary rounded-circle d-flex align-items-center justify-content-center me-2"
                            style="width: 35px; height: 35px;">
                            <small><b>${initials}</b></small>
                        </div>
                        ${customer.name}
                    </div>
                </td>
                <td>${customer.mobile || 'N/A'}</td>
                <td>₹ ${customer.total_spend.toLocaleString()}</td>
                <td>${customer.last_visit || 'N/A'}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="viewCustomer(${customer.id})">
                        <i class="fas fa-eye"></i> View
                    </button>
                    <button class="btn btn-sm btn-outline-warning me-1" onclick="editCustomer(${customer.id})">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteCustomer(${customer.id}, '${customer.name}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </td>
            `;
            customerTableBody.appendChild(tr);
        });
    }

    // Handle Form Submission
    if (addCustomerForm) {
        addCustomerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(addCustomerForm);
            const data = Object.fromEntries(formData.entries());

            // Mobile Validation: Must start with 9, 8, 7, or 6 and be 10 digits
            const mobile = data.mobile.trim();
            const validFirstDigits = ['9', '8', '7', '6'];

            if (!validFirstDigits.includes(mobile[0]) || mobile.length !== 10 || isNaN(mobile)) {
                alert("Error: Mobile number must start with 9, 8, 7, or 6 and must be exactly 10 digits.");
                return;
            }

            let result;
            if (addCustomerForm.dataset.mode === 'edit') {
                const id = parseInt(addCustomerForm.dataset.id);
                result = await DB.updateCustomer(id, data);
            } else {
                result = await DB.addCustomer(data);
            }

            if (result.success) {
                alert(addCustomerForm.dataset.mode === 'edit' ? 'Customer updated!' : 'Customer added!');
                const modal = bootstrap.Modal.getInstance(document.getElementById('addCustomerModal'));
                if (modal) modal.hide();
                resetCustomerForm();
                loadCustomers();
            } else {
                alert('Error: ' + result.message);
            }
        });
    }

    function resetCustomerForm() {
        addCustomerForm.reset();
        delete addCustomerForm.dataset.mode;
        delete addCustomerForm.dataset.id;
        const submitBtn = addCustomerForm.parentElement.parentElement.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.innerText = 'Save Customer';
        const title = document.querySelector('#addCustomerModal .modal-title');
        if (title) title.innerText = 'Add New Customer';
    }

    // Reset form when modal closed
    document.getElementById('addCustomerModal').addEventListener('hidden.bs.modal', resetCustomerForm);

    // Search Filtering
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const filtered = window.allCustomers.filter(c =>
                c.name.toLowerCase().includes(term) ||
                (c.mobile && c.mobile.includes(term))
            );
            renderCustomers(filtered);
        });
    }

    window.editCustomer = (id) => {
        const customer = window.allCustomers.find(c => c.id === id);
        if (!customer) return;

        addCustomerForm.dataset.mode = 'edit';
        addCustomerForm.dataset.id = id;
        addCustomerForm.name.value = customer.name;
        addCustomerForm.mobile.value = customer.mobile;

        const modal = new bootstrap.Modal(document.getElementById('addCustomerModal'));
        document.querySelector('#addCustomerModal .modal-title').innerText = 'Edit Customer';
        document.querySelector('#addCustomerModal button[type="submit"]').innerText = 'Update Customer';
        modal.show();
    };

    window.viewCustomer = async (id) => {
        const customer = window.allCustomers.find(c => c.id === id);
        if (!customer) return;

        // Populate Modal (Simple version for now, could fetch real history later)
        const modal = document.getElementById('customerProfileModal');

        modal.querySelector('h4').innerText = customer.name;
        modal.querySelector('.fa-phone').parentElement.innerHTML = `<i class="fas fa-phone me-2"></i> ${customer.mobile || 'N/A'}`;
        modal.querySelector('.text-success').innerText = `₹ ${customer.total_spend.toLocaleString()}`;

        const bootstrapModal = new bootstrap.Modal(modal);
        bootstrapModal.show();
    };

    window.deleteCustomer = async (id, name) => {
        if (!confirm(`Are you sure you want to delete customer "${name}"? This action cannot be undone.`)) {
            return;
        }

        try {
            const result = await DB.deleteCustomer(id);
            if (result.success) {
                alert('Customer deleted successfully!');
                loadCustomers();
            } else {
                alert('Error: ' + result.message);
            }
        } catch (error) {
            console.error('Error deleting customer:', error);
            alert('Failed to delete customer. Please try again.');
        }
    };

    // Initial load
    loadCustomers();
});
