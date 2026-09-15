// Bill View Logic for SAMRUDDI MEDICAL SHOP - Professional Format
// Connects to Flask/SQL backend via DB (js/db.js)

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Professional Bill View Initialized');

    // 1. Get Bill ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const billId = urlParams.get('id');

    if (!billId) {
        alert("No Bill ID provided!");
        return;
    }

    // 2. Fetch Bill Details
    try {
        const result = await DB.getBill(billId);
        if (result.success) {
            renderBill(result);
        } else {
            alert("Error: " + result.message);
        }
    } catch (e) {
        console.error("Failed to load bill", e);
    }

    function renderBill(data) {
        // Update Header & Customer Info
        document.getElementById('billToName').innerText = data.customer.name;
        document.getElementById('billToPhone').innerText = data.customer.mobile || 'N/A';

        // Populate new fields
        if (document.getElementById('customerAddress')) document.getElementById('customerAddress').innerText = data.customer.address || 'Hubli';
        if (document.getElementById('customerGstin')) document.getElementById('customerGstin').innerText = data.customer.gstin || 'N/A';
        if (document.getElementById('placeOfSupply')) document.getElementById('placeOfSupply').innerText = data.customer.state || 'Karnataka';

        document.getElementById('billNo').innerText = data.bill_no;
        document.getElementById('billDate').innerText = data.bill_date;
        if (document.getElementById('paymentMode')) {
            document.getElementById('paymentMode').innerText = data.payment_mode || 'Cash';
        }

        // Update Items Table
        const tbody = document.getElementById('billItemsBody');
        tbody.innerHTML = '';

        let totalQty = 0;
        let totalDisc = 0;
        let totalTaxable = 0;
        let hsnSummary = {};

        data.items.forEach((item, index) => {
            const tr = document.createElement('tr');

            const qty = parseFloat(item.quantity) || 0;
            const mrp = parseFloat(item.mrp) || 0;
            const rate = parseFloat(item.rate) || mrp;
            const discPercent = parseFloat(item.discount_percent) || 0;
            const taxableValue = parseFloat(item.taxable_value) || (rate * qty); // Use rate * qty as default if taxable_value is missing
            const total = parseFloat(item.total) || taxableValue * 1.12;

            totalQty += qty;
            totalDisc += (mrp - rate) * qty;
            totalTaxable += taxableValue;

            const hsn = item.hsn_sac || 'OTHERS';
            if (!hsnSummary[hsn]) {
                hsnSummary[hsn] = { taxable: 0, gst: 0, total: 0 };
            }
            hsnSummary[hsn].taxable += taxableValue;
            hsnSummary[hsn].gst += (total - taxableValue);
            hsnSummary[hsn].total += total;

            tr.innerHTML = `
                <td>${item.name}</td>
                <td class="text-center">${item.batch_no || 'N/A'}</td>
                <td class="text-center">${item.mfg_date || 'N/A'}</td>
                <td class="text-center">${item.expiry_date || 'N/A'}</td>
                <td class="text-center">${item.hsn_sac || 'N/A'}</td>
                <td class="text-center">${qty}</td>
                <td class="text-end">${mrp.toFixed(2)}</td>
                <td class="text-end">${rate.toFixed(2)}</td>
                <td class="text-center">${discPercent.toFixed(2)}</td>
                <td class="text-end">${taxableValue.toFixed(2)}</td>
            `;
            tbody.appendChild(tr);
        });

        // Fill empty rows to maintain layout
        const minRows = 12; // Increased to match image better
        for (let i = data.items.length; i < minRows; i++) {
            const tr = document.createElement('tr');
            tr.className = 'empty-rows';
            tr.innerHTML = `<td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>`;
            tbody.appendChild(tr);
        }

        // Update Totals
        document.getElementById('totalQty').innerText = totalQty;
        document.getElementById('totalTaxable').innerText = totalTaxable.toFixed(2);
        document.getElementById('totalItemsCount').innerText = data.items.length;

        const totalAmount = parseFloat(data.total_amount) || 0;
        const subTotal = parseFloat(data.subtotal) || totalTaxable;
        const gstAmount = parseFloat(data.gst_amount) || (totalAmount - subTotal);

        document.getElementById('gstAmount').innerText = gstAmount.toFixed(2);
        document.getElementById('billTotalAmount').innerText = totalAmount.toFixed(2);

        // HSN Summary Table
        const hsnTbody = document.getElementById('hsnSummaryBody');
        hsnTbody.innerHTML = '';
        let hsnTotalTaxable = 0;
        let hsnTotalGst = 0;
        let hsnGrandTotal = 0;

        Object.keys(hsnSummary).forEach(hsn => {
            const row = hsnSummary[hsn];
            hsnTotalTaxable += row.taxable;
            hsnTotalGst += row.gst;
            hsnGrandTotal += row.total;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${hsn}</td>
                <td>12.00</td>
                <td>0.00</td>
                <td>${row.gst.toFixed(2)}</td>
                <td>${row.taxable.toFixed(2)}</td>
                <td>${row.total.toFixed(2)}</td>
            `;
            hsnTbody.appendChild(tr);
        });

        if (document.getElementById('hsnTotalGst')) document.getElementById('hsnTotalGst').innerText = hsnTotalGst.toFixed(2);
        document.getElementById('hsnGrandTotal_Taxable').innerText = '₹ ' + hsnTotalTaxable.toFixed(2);
        document.getElementById('hsnGrandTotal_Final').innerText = '₹ ' + hsnGrandTotal.toFixed(2);

        // Words conversion
        document.getElementById('totalInWords').innerText = numberToWords(Math.round(totalAmount)) + " Rupees Only";
        document.getElementById('taxInWords').innerText = numberToWords(Math.round(gstAmount)) + " Rupees Only";

        // Update QR Section
        const qrImg = document.getElementById('billQrImage');
        if (qrImg) {
            const upiId = '6360246268@ibl';
            const upiName = 'SAMRUDDHI%20MEDICAL%20STORE';
            const upiLink = `upi://pay?pa=${upiId}&pn=${upiName}&am=${totalAmount.toFixed(2)}&tn=Bill%20${data.bill_no}&cu=INR`;
            qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(upiLink)}`;
        }
    }

    function numberToWords(number) {
        if (number === 0) return 'Zero';
        const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
        const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
        const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
        const scaler = ['', 'Thousand', 'Lakh', 'Crore'];

        function convertSection(num) {
            let res = '';
            if (num > 99) {
                res += units[Math.floor(num / 100)] + ' Hundred ';
                num %= 100;
            }
            if (num > 19) {
                res += tens[Math.floor(num / 10)] + ' ';
                num %= 10;
            }
            if (num > 9) {
                res += teens[num - 10] + ' ';
            } else if (num > 0) {
                res += units[num] + ' ';
            }
            return res;
        }

        let words = '';
        let sectionCount = 0;

        // Handle Crores/Lakhs/Thousands (Indian numbering system)
        if (number >= 10000000) {
            words += convertSection(Math.floor(number / 10000000)) + 'Crore ';
            number %= 10000000;
        }
        if (number >= 100000) {
            words += convertSection(Math.floor(number / 100000)) + 'Lakh ';
            number %= 100000;
        }
        if (number >= 1000) {
            words += convertSection(Math.floor(number / 1000)) + 'Thousand ';
            number %= 1000;
        }
        words += convertSection(number);

        return words.trim();
    }

    window.downloadPDF = function () {
        const element = document.getElementById('printableBill');
        const billNo = document.getElementById('billNo').innerText;
        const opt = {
            margin: [5, 5, 5, 5],
            filename: `Invoice_${billNo}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: {
                scale: 2,
                useCORS: true,
                logging: false,
                letterRendering: true
            },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        };

        html2pdf().set(opt).from(element).save();
    };


});
