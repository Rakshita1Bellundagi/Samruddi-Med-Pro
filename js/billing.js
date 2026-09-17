// Billing Logic for SAMRUDDI MEDICAL SHOP
// Connects to Flask/SQL backend via DB (js/db.js)

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Billing System Initialized');

    // Elements
    const medicineSearch = document.getElementById('medicineSearch');
    const batchSelect = document.getElementById('batchSelect');
    const qtyInput = document.getElementById('qtyInput');
    const addBtn = document.getElementById('addBtn');
    const billItemsTable = document.getElementById('billItems');
    const subtotalText = document.getElementById('subtotalAmount');
    const gstText = document.getElementById('gstAmount');
    const totalAmountText = document.getElementById('totalAmountDisplay');
    const generateBtn = document.getElementById('generateBtn');
    const whatsappBtn = document.getElementById('whatsappBtn');
    const upiScannerSection = document.getElementById('upiScannerSection');
    const qrAmount = document.getElementById('qrAmount');

    const discountInput = document.getElementById('discountInput');

    let cart = [];
    const customerSearchInput = document.getElementById('customerSearch');
    const customerSuggestions = document.getElementById('customerSuggestions');
    const customerInfoDiv = document.getElementById('customerInfo');
    const noCustomerDiv = document.getElementById('noCustomer');
    const custNameSpan = document.getElementById('custName');

    let selectedCustomer = null;
    let allCustomers = [];
    let isPaymentConfirmed = false;
    let isUpiFetched = false;
    let currentBillNo = "0000";

    // Initial Bill No set from API
    async function refreshNextBillNo() {
        try {
            const res = await fetch('https://samruddi-med-pro.onrender.com/api/bills/next-number');
            const data = await res.json();
            currentBillNo = data.next_no;
            const billNoBadge = document.getElementById('billNoBadge');
            if (billNoBadge) billNoBadge.innerText = '#' + currentBillNo;
        } catch (e) {
            console.error("Failed to fetch next bill number", e);
            currentBillNo = 'BILL-' + Date.now().toString().slice(-6);
        }
    }
    refreshNextBillNo();

    // Fetch customers
    try {
        allCustomers = await DB.getCustomers();
    } catch (e) { console.error("Failed to load customers", e); }

    // 1. Customer Search Logic with Dropdown
    customerSearchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        customerSuggestions.innerHTML = '';

        if (query.length < 1) {
            customerSuggestions.style.display = 'none';
            selectedCustomer = null;
            customerInfoDiv.style.display = 'none';
            noCustomerDiv.style.display = 'block';
            return;
        }

        const matches = allCustomers.filter(c =>
            c.name.toLowerCase().includes(query) ||
            (c.mobile && c.mobile.includes(query))
        ).slice(0, 10);

        if (matches.length > 0) {
            matches.forEach(c => {
                const div = document.createElement('div');
                div.className = 'suggestion-item';
                div.innerHTML = `
                    <div><strong>${c.name}</strong></div>
                    <div class="small">${c.mobile || 'No Mobile'}</div>
                `;
                div.addEventListener('click', () => {
                    customerSearchInput.value = c.name;
                    customerSuggestions.style.display = 'none';
                    selectCustomer(c);
                });
                customerSuggestions.appendChild(div);
            });
            customerSuggestions.style.display = 'block';
        } else {
            customerSuggestions.style.display = 'none';
        }
    });

    function selectCustomer(customer) {
        selectedCustomer = customer;
        custNameSpan.innerText = customer.name;
        document.getElementById('custMobile').innerText = customer.mobile || 'N/A';
        customerInfoDiv.style.display = 'block';
        noCustomerDiv.style.display = 'none';

        // Update name in other steps
        const name2 = document.getElementById('step2CustName');
        const name3 = document.getElementById('step3CustName');
        if (name2) name2.innerText = customer.name;
        if (name3) name3.innerText = customer.name;
    }

    // Close customer suggestions on outside click
    document.addEventListener('click', (e) => {
        if (e.target !== customerSearchInput) {
            customerSuggestions.style.display = 'none';
        }
    });

    // --- Helper Functions ---
    function formatDate(dateStr) {
        if (!dateStr) return new Date().toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
        const d = new Date(dateStr);
        const now = new Date();
        d.setHours(now.getHours(), now.getMinutes());
        return d.toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
    }

    async function finalizeBill(isWhatsAppRequested = false) {
        if (cart.length === 0) {
            alert("Cart is empty! Please add items to the bill first.");
            return;
        }

        // 1. Calculate values
        const totalTaxable = cart.reduce((sum, item) => sum + item.taxable_value, 0);
        const discountVal = parseFloat(discountInput.value) || 0;
        const subtotalVal = totalTaxable;
        const gstVal = subtotalVal * 0.12;
        const totalVal = subtotalVal + gstVal - discountVal;

        // Use a simpler check: if it's WhatsApp, we still want to ensure intent is clear
        const shouldShare = isWhatsAppRequested;

        if (isWhatsAppRequested && (!selectedCustomer || !selectedCustomer.mobile)) {
            alert("Please select a customer with a valid mobile number for WhatsApp sharing.");
            return;
        }

        const confirmMsg = isWhatsAppRequested ? "Confirm and Share via WhatsApp?" : "Confirm and Generate Bill?";
        if (!confirm(confirmMsg)) return;

        try {
            // UI Feedback
            generateBtn.disabled = true;
            generateBtn.innerText = "Processing...";
            if (whatsappBtn) {
                // whatsappBtn removed from HTML
            }

            // 1. Update Inventory for each item
            for (const item of cart) {
                await DB.updateStock(item.batchNo, 'sale', item.qty);
            }

            // 2. Prepare Bill Data
            const utrVal = utrInput ? utrInput.value : '';

            const billData = {
                bill_no: currentBillNo,
                subtotal: subtotalVal,
                gst_amount: gstVal,
                discount_amount: discountVal,
                total_amount: totalVal,
                payment_mode: document.querySelector('input[name="payment"]:checked').id,
                utr_number: utrVal,
                items: cart,
                customer_id: selectedCustomer ? selectedCustomer.id : null,
                bill_date: formatDate(document.getElementById('billDate').value)
            };

            // 3. Save to Database
            console.log("Saving bill:", billData);
            const result = await DB.createBill(billData);

            if (result.success) {
                const billId = result.id;
                sessionStorage.removeItem('pendingBill');

                if (isWhatsAppRequested && selectedCustomer && selectedCustomer.mobile) {
                    alert("Bill generated successfully! Opening sharing options...");
                    window.location.href = `bill_view.html?id=${billId}&share=true`;
                } else {
                    alert("Bill generated successfully!");
                    window.location.href = `bill_view.html?id=${billId}`;
                }
            } else {
                throw new Error(result.message || "Failed to save bill to database");
            }
        } catch (e) {
            console.error("Error finalizing bill:", e);
            alert("Error: " + e.message);
            // Reset buttons
            generateBtn.disabled = false;
            generateBtn.innerHTML = '<i class="fas fa-check-circle me-1"></i> Complete & Print';
            if (whatsappBtn) {
                // whatsappBtn removed from HTML
            }
        }
    }

    let allMedicines = [];

    // Fetch medicines
    try {
        allMedicines = await DB.getInventory();
    } catch (e) { console.error("Failed to load medicines", e); }

    // Elements improvement: handle search dropdown
    const medicineSuggestions = document.getElementById('medicineSuggestions');
    const mrpInput = document.getElementById('mrpInput');
    const utrInput = document.getElementById('utrInput');
    // const medicineSearch = document.getElementById('medicineSearch'); // Already defined above

    // 2. Medicine Search Logic with Dropdown
    medicineSearch.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        medicineSuggestions.innerHTML = '';

        // Clear MRP if clearing search
        if (query.length < 1) {
            medicineSuggestions.style.display = 'none';
            if (mrpInput) mrpInput.value = '';
            return;
        }

        // Find matches (group by name to avoid duplicate names in dropdown if multiple batches exist)
        const uniqueNames = [...new Set(allMedicines.map(m => m.name))];
        const matches = uniqueNames.filter(name => name.toLowerCase().includes(query)).slice(0, 10);

        if (matches.length > 0) {
            matches.forEach(name => {
                const med = allMedicines.find(m => m.name === name);
                const div = document.createElement('div');
                div.className = 'suggestion-item';
                div.innerHTML = `
                    <div><strong>${med.name}</strong></div>
                    <div class="small">${med.salt}</div>
                `;
                div.addEventListener('click', () => {
                    medicineSearch.value = med.name;
                    medicineSuggestions.style.display = 'none';
                    updateBatchOptions(med);
                });
                medicineSuggestions.appendChild(div);
            });
            medicineSuggestions.style.display = 'block';
        } else {
            medicineSuggestions.style.display = 'none';
        }
    });

    // Close suggestions when clicking outside
    document.addEventListener('click', (e) => {
        if (e.target !== medicineSearch) {
            medicineSuggestions.style.display = 'none';
        }
    });

    function updateBatchOptions(medicine) {
        batchSelect.innerHTML = `<option value="${medicine.batchNo}" data-price="${medicine.mrp}">${medicine.batchNo} (₹${medicine.mrp})</option>`;
        if (mrpInput) mrpInput.value = medicine.mrp;
        qtyInput.value = ''; // Force user to enter quantity
        qtyInput.focus();
    }

    // Handle Enter key on Qty input for fast adding
    qtyInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addBtn.click();
        }
    });

    // 3. Add to Cart
    addBtn.addEventListener('click', () => {
        const medicineName = medicineSearch.value;
        const batchNo = batchSelect.value;
        const qty = parseInt(qtyInput.value);
        const medicine = allMedicines.find(m => m.batchNo === batchNo);

        if (!medicine) {
            alert("Please search and select a medicine first.");
            return;
        }

        if (!qtyInput.value || isNaN(qty) || qty <= 0) {
            alert("please select quantity");
            qtyInput.focus();
            return;
        }

        // Allow sale even if stock is low? Warning is good.
        // But if manual MRP is used, we might be selling a generic item? 
        // Logic assumes we align with an inventory item.
        if (qty > medicine.stock) {
            alert(`Only ${medicine.stock} units available in stock!`);
            return;
        }

        const manualMrp = mrpInput ? parseFloat(mrpInput.value) : medicine.mrp;
        const discountPercent = 0; // Can be enhanced later
        const rate = manualMrp; // Can be enhanced later to support discount
        const taxableValue = rate * qty;

        const cartItem = {
            id: medicine.id,
            name: medicine.name,
            batchNo: medicine.batchNo,
            hsn_sac: medicine.hsn_sac || '',
            mfg_date: medicine.mfg_date || '',
            expiry: medicine.expiry,
            mrp: manualMrp,
            rate: rate,
            discount_percent: discountPercent,
            taxable_value: taxableValue,
            qty: qty,
            total: taxableValue // GST is added at the end
        };

        cart.push(cartItem);
        renderCart();

        // Reset inputs
        medicineSearch.value = '';
        qtyInput.value = '';
        if (mrpInput) mrpInput.value = '';
        batchSelect.innerHTML = '<option>Select</option>';
        isPaymentConfirmed = false;
        isUpiFetched = false;
        updatePaymentUI();

        // Update next item indicator
        const nextItemNo = document.getElementById('currentItemNo');
        if (nextItemNo) nextItemNo.innerText = '#' + (cart.length + 1);

        // Autofocus back to search for next item
        medicineSearch.focus();
    });

    function renderCart() {
        billItemsTable.innerHTML = '';
        let subtotal = 0;

        cart.forEach((item, index) => {
            subtotal += item.total;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${index + 1}</td>
                <td>${item.name}</td>
                <td>${item.batchNo}</td>
                <td>${item.mrp.toFixed(2)}</td>
                <td>${item.qty}</td>
                <td>${item.total.toFixed(2)}</td>
                <td class="text-end pe-3"><button class="btn btn-sm text-danger remove-item" data-index="${index}"><i class="fas fa-trash-alt"></i></button></td>
            `;
            billItemsTable.appendChild(tr);
        });

        // Update current item indicator on render too (for removals)
        const nextItemNo = document.getElementById('currentItemNo');
        if (nextItemNo) nextItemNo.innerText = '#' + (cart.length + 1);

        const gst = subtotal * 0.12;
        const discount = parseFloat(discountInput.value) || 0;
        const total = subtotal + gst - discount;

        subtotalText.innerText = `₹ ${subtotal.toFixed(2)}`;
        gstText.innerText = `₹ ${gst.toFixed(2)}`;
        totalAmountText.innerText = `₹ ${total.toFixed(2)}`;
        qrAmount.innerText = total.toFixed(2);

        // Dynamic UPI QR Generation (Encodes Amount for Auto-Fill)
        const upiId = '6360246268@ibl';
        const upiName = 'RAKSHITA%20BELLUNDAGI';
        // Use a placeholder note for the billing screen, updated to actual bill no on view page
        const upiLink = `upi://pay?pa=${upiId}&pn=${upiName}&am=${total.toFixed(2)}&tn=Pharmacy%20Bill&cu=INR`;
        const qrImage = document.getElementById('qrImage');

        if (qrImage && total > 0) {
            // Restore Dynamic QR: Encodes Amount for Auto-Fill
            const upiId = '6360246268@ibl';
            const upiName = 'RAKSHITA%20BELLUNDAGI';
            const upiLink = `upi://pay?pa=${upiId}&pn=${upiName}&am=${total.toFixed(2)}&tn=Pharmacy%20Bill&cu=INR`;

            qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(upiLink)}`;
            qrImage.style.width = '180px';
            qrImage.style.height = '180px';
        } else if (qrImage) {
            // Fallback to static PhonePe scanner if amount is 0
            qrImage.src = 'img/phonepe_scanner.jpg';
        }



        // Remove functionality
        document.querySelectorAll('.remove-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = e.currentTarget.dataset.index;
                cart.splice(idx, 1);
                isPaymentConfirmed = false;
                isUpiFetched = false;
                updatePaymentUI();
                renderCart();
            });
        });
    }

    function updatePaymentUI() {
        const confirmBtn = document.getElementById('confirmPaymentBtn');
        const reviewBtn = document.getElementById('reviewBillBtn');
        const statusAlert = document.getElementById('paymentStatusAlert');

        if (isPaymentConfirmed) {
            if (confirmBtn) {
                confirmBtn.innerHTML = '<i class="fas fa-check-circle me-1"></i> Payment Confirmed';
                confirmBtn.classList.replace('btn-success', 'btn-outline-success');
                confirmBtn.disabled = true;
            }
            if (reviewBtn) reviewBtn.style.display = 'block';
            if (statusAlert) statusAlert.style.display = 'none';
        } else {
            if (confirmBtn) {
                confirmBtn.innerHTML = '<i class="fas fa-check-circle me-1"></i> Confirm Payment Received';
                confirmBtn.classList.replace('btn-outline-success', 'btn-success');
                confirmBtn.disabled = false;
            }
            if (reviewBtn) reviewBtn.style.display = 'none';
            // Only show alert if we are on step 3
            if (statusAlert && document.getElementById('step3').classList.contains('active')) {
                statusAlert.style.display = 'block';
            }
        }
    }

    const confirmPaymentBtn = document.getElementById('confirmPaymentBtn');
    const fetchUpiBtn = document.getElementById('fetchUpiBtn');

    if (fetchUpiBtn) {
        fetchUpiBtn.addEventListener('click', () => {
            const total = parseFloat(totalAmountText.innerText.replace('₹ ', '')) || 0;
            if (total <= 0) {
                alert("Please add items to the cart first.");
                return;
            }

            fetchUpiBtn.disabled = true;
            fetchUpiBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Fetching Payment...';

            // Simulate fetching from UPI gateway
            setTimeout(() => {
                fetchUpiBtn.disabled = false;
                fetchUpiBtn.innerHTML = '<i class="fas fa-check-circle me-1"></i> Payment Fetched';
                fetchUpiBtn.classList.replace('btn-outline-primary', 'btn-success');
                isUpiFetched = true;

                alert(`Status: Payment of ₹${total.toFixed(2)} has been successfully fetched and verified.`);
            }, 2000);
        });
    }

    if (confirmPaymentBtn) {
        confirmPaymentBtn.addEventListener('click', () => {
            const total = parseFloat(totalAmountText.innerText.replace('₹ ', '')) || 0;
            const isUpi = document.getElementById('upi').checked;

            if (total <= 0) {
                alert("Please add items to the cart first.");
                return;
            }

            if (isUpi && !isUpiFetched) {
                alert("No payment detected. Please scan the QR code and click 'Fetch Payment Status' before confirming.");
                return;
            }

            const confirmMsg = isUpi ?
                "Verify: UPI Payment of ₹" + total.toFixed(2) + " received?" :
                "Confirm: Cash Payment of ₹" + total.toFixed(2) + " received?";

            if (confirm(confirmMsg)) {
                isPaymentConfirmed = true;
                updatePaymentUI();
            }
        });
    }

    // 4. Generate & Print (Finalize Bill)
    if (generateBtn) {
        generateBtn.addEventListener('click', () => finalizeBill(false));
    }

    // --- Import Pending Items from Medicines Page ---
    function importPendingItems() {
        const pending = JSON.parse(sessionStorage.getItem('pendingBill') || '[]');
        if (pending.length > 0) {
            console.log(`Importing ${pending.length} pending items...`);
            pending.forEach(item => {
                cart.push({
                    ...item,
                    total: item.mrp * item.qty
                });
            });
            renderCart();
            sessionStorage.removeItem('pendingBill');
            alert(`Imported ${pending.length} items from your medicine selection.`);
        }
    }

    // --- Add New Customer Logic ---
    const addCustomerForm = document.getElementById('addCustomerForm');
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

            const result = await DB.addCustomer(data);
            if (result.success) {
                alert('Customer added successfully!');
                // Update local list
                allCustomers = await DB.getCustomers();
                // Select the new customer
                const newCust = allCustomers.find(c => c.mobile === data.mobile) || result.customer;
                if (newCust) selectCustomer(newCust);

                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('addCustomerModal'));
                if (modal) modal.hide();
                addCustomerForm.reset();
            } else {
                alert('Error: ' + result.message);
            }
        });
    }



    if (discountInput) {
        discountInput.addEventListener('input', () => renderCart());
    }

    // --- Payment Mode Logic ---
    document.querySelectorAll('input[name="payment"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.id === 'upi') {
                upiScannerSection.style.display = 'block';
                // Reset fetch button if switching back to UPI
                if (fetchUpiBtn) {
                    fetchUpiBtn.innerHTML = '<i class="fas fa-sync-alt me-1"></i> Fetch Payment Status';
                    fetchUpiBtn.classList.replace('btn-success', 'btn-outline-primary');
                }
            } else {
                upiScannerSection.style.display = 'none';
            }
            // Reset payment confirmation and fetch status if mode changes
            isPaymentConfirmed = false;
            isUpiFetched = false;
            updatePaymentUI();
        });
    });

    // WhatsApp button logic removed

    // Set current date as default
    const dateInput = document.getElementById('billDate');
    if (dateInput) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }

    // --- 4-Step Wizard Navigation Logic ---
    const nextButtons = document.querySelectorAll('.next-step');
    const prevButtons = document.querySelectorAll('.prev-step');
    const steps = document.querySelectorAll('.step-content-panel');
    const progressItems = document.querySelectorAll('.step-item');

    function goToStep(stepNum) {
        // Validation for each step
        if (stepNum === 2 && !selectedCustomer) {
            alert('Please select or add a customer before proceeding to add items.');
            return;
        }
        if (stepNum === 3 && cart.length === 0) {
            alert('Please add at least one item to the cart before proceeding to payment.');
            return;
        }
        if (stepNum === 3) {
            updatePaymentUI();
        }
        if (stepNum === 4) {
            if (!isPaymentConfirmed) {
                alert("Please make a payment and confirm it before reviewing the bill.");
                return;
            }
        }

        // Hide all steps
        steps.forEach(s => s.classList.remove('active'));
        // Deactivate all progress items
        progressItems.forEach(p => {
            p.classList.remove('active');
            if (parseInt(p.dataset.step) < stepNum) {
                p.classList.add('completed');
            } else {
                p.classList.remove('completed');
            }
        });

        // Show target step
        document.getElementById(`step${stepNum}`).classList.add('active');
        document.querySelector(`.step-item[data-step="${stepNum}"]`).classList.add('active');

        // Populate Review Step (Step 4)
        if (stepNum === 4) {
            document.getElementById('reviewCustName').innerText = selectedCustomer ? selectedCustomer.name : 'Walking Customer';
            document.getElementById('reviewCustMobile').innerText = selectedCustomer ? 'Phone: ' + (selectedCustomer.mobile || 'N/A') : 'Phone: N/A';
            document.getElementById('reviewItemCount').innerText = cart.length;
            document.getElementById('reviewTotal').innerText = totalAmountText.innerText;

            // Populate items table in review
            const reviewBody = document.getElementById('reviewItemsBody');
            if (reviewBody) {
                reviewBody.innerHTML = '';
                cart.forEach((item, index) => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>
                            <div class="fw-bold">${item.name}</div>
                            <small class="text-muted">Batch: ${item.batchNo}</small>
                        </td>
                        <td class="text-end">${item.qty}</td>
                        <td class="text-end">₹${item.mrp.toFixed(2)}</td>
                        <td class="text-end fw-bold">₹${item.total.toFixed(2)}</td>
                    `;
                    reviewBody.appendChild(tr);
                });
            }
        }
    }

    nextButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const next = parseInt(btn.dataset.next);
            goToStep(next);
        });
    });

    prevButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const prev = parseInt(btn.dataset.prev);
            goToStep(prev);
        });
    });

    importPendingItems();
});
