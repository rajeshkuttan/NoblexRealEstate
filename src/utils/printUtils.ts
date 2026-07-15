/**
 * Print Utility for generating and printing HTML documents
 */

export const printDocument = (title: string, htmlContent: string) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    console.error('Failed to open print window');
    return false;
  }

  printWindow.document.write(htmlContent);
  printWindow.document.close();
  return true;
};

export const defaultCompanyBranding = {
  name: "Company",
  address: "",
  phone: "",
  email: "",
  vatNumber: "",
};

export const generateReceiptHtml = (rec: any) => {
  const companyInfo = rec.companyInfo || defaultCompanyBranding;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Official Receipt - ${rec.paymentNumber}</title>
      <style>
        @media print {
          @page { size: A4; margin: 0; }
          body { margin-top: 2.5in; margin-left: 0.5in; margin-right: 0.5in; margin-bottom: 0.5in; }
        }
        body { font-family: 'Inter', Arial, sans-serif; font-size: 14px; line-height: 1.5; color: #333; }
        .header { display: flex; justify-content: space-between; border-bottom: 3px solid #10b981; padding-bottom: 20px; margin-bottom: 40px; }
        .title { font-size: 28px; font-weight: 800; color: #065f46; margin: 0; }
        .receipt-banner { background-color: #f0fdf4; padding: 25px; border-radius: 8px; margin-bottom: 30px; border: 1px solid #dcfce7; }
        .amount-big { font-size: 32px; font-weight: 900; color: #059669; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 30px; }
        .label { font-weight: 600; width: 140px; display: inline-block; color: #64748b; }
        .footer { margin-top: 100px; display: flex; justify-content: space-between; }
        .signature-box { text-align: center; width: 220px; border-top: 1px solid #94a3b8; padding-top: 10px; font-weight: 600; }
        .branding { text-align: center; font-size: 10px; color: #94a3b8; margin-top: 60px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <h1 class="title">OFFICIAL RECEIPT</h1>
          <p style="margin: 5px 0 0 0; color: #64748b; font-weight: 600;"># ${rec.paymentNumber}</p>
        </div>
        <div style="text-align: right;">
          <div style="font-weight: 800; font-size: 18px; color: #065f46;">${companyInfo.name}</div>
          <div style="color: #64748b;">${companyInfo.address}</div>
          <div style="color: #64748b;">TRN: ${companyInfo.vatNumber}</div>
        </div>
      </div>

      <div class="receipt-banner">
        <div style="text-transform: uppercase; font-size: 12px; font-weight: 800; color: #059669; margin-bottom: 5px; letter-spacing: 1px;">Amount Received</div>
        <div class="amount-big">${new Intl.NumberFormat("en-AE", { style: "currency", currency: "AED" }).format(rec.amount)}</div>
        <div style="margin-top: 5px; color: #059669; font-weight: 500;">
          Date: ${new Date(rec.paymentDate).toLocaleDateString('en-AE', { day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>

      <div class="info-grid">
        <div>
          <div style="font-weight: 700; margin-bottom: 10px; color: #065f46; text-transform: uppercase; font-size: 12px; letter-spacing: 1px; border-bottom: 1px solid #dcfce7; padding-bottom: 5px;">Received From</div>
          <div style="font-weight: 700; font-size: 18px; color: #1e293b;">${rec.tenantName || rec.payeeName || "Valued Customer"}</div>
          <div style="margin-top: 15px; color: #475569; font-size: 13px;">
            <div style="margin-bottom: 4px;"><span class="label">Payment Method:</span> ${rec.paymentMethod?.replace('_', ' ').toUpperCase()}</div>
            <div><span class="label">Reference:</span> ${rec.paymentReference || rec.paymentDetails?.instrumentNumber || "N/A"}</div>
          </div>
        </div>
        <div>
          <div style="font-weight: 700; margin-bottom: 10px; color: #065f46; text-transform: uppercase; font-size: 12px; letter-spacing: 1px; border-bottom: 1px solid #dcfce7; padding-bottom: 5px;">Payment Allocation</div>
          <div style="color: #475569; font-size: 13px;">
            <div style="margin-bottom: 4px;"><span class="label">Invoice No:</span> ${rec.invoice?.invoiceNumber || "N/A"}</div>
            <div style="margin-bottom: 4px;"><span class="label">Category:</span> ${(rec.category || rec.paymentPurpose?.category || 'General').toUpperCase()}</div>
            <div style="margin-bottom: 4px;"><span class="label">Status:</span> <span style="color: #059669; font-weight: 600;">${rec.status?.toUpperCase() || 'COMPLETED'}</span></div>
            <div><span class="label">Remarks:</span> ${rec.remarks || rec.paymentPurpose?.description || "Payment received with thanks."}</div>
          </div>
        </div>
      </div>

      <div style="margin-top: 40px; padding: 20px; border: 1px dashed #cbd5e1; border-radius: 8px; font-style: italic; color: #64748b; font-size: 12px; text-align: center;">
        This is a computer-generated receipt and does not require a physical signature for digital verification.
      </div>

      <div class="footer">
        <div class="signature-box">Authorized Signature</div>
        <div class="signature-box">Customer Acknowledgment</div>
      </div>

      <div class="branding">Generated by Emirates Lease Flow</div>

      <script>
        window.onload = () => { 
          window.print(); 
          setTimeout(() => { window.close(); }, 500);
        }
      </script>
    </body>
    </html>
  `;
};

export const generateVoucherHtml = (data: any, type: 'payment' | 'receipt' | 'journal' | 'purchase' | 'invoice' = 'payment') => {
  const companyInfo = data.companyInfo || {
    name: "Emirates Lease Flow",
    address: "Dubai, UAE",
    phone: "+971 4 000 0000"
  };
  const logoUrl = data.companyInfo?.logoUrl || `${window.location.origin}/withyoulogo.png`;

  let voucherTitle = "PAYMENT VOUCHER";
  let voucherNo = data.paymentNumber || data.jvNumber || data.invoiceNumber || '—';
  let date = data.paymentDate || data.date || data.invoiceDate || new Date();
  let paidTo = data.tenantName || data.payeeName || data.vendor?.vendorName || data.tenant?.name || '—';
  let narration = data.remarks || data.description || data.narration || data.notes || '—';
  let isPostedValue = data.isPosted === true || data.isPosted === 1 || data.isPosted === '1' || data.isPosted === 'true';
  // Strict posted check based on isPosted flag or specific 'posted' status. 
  // 'paid' is removed to avoid incorrectly labeling unposted receipts as POSTED.
  let status = isPostedValue || data.status === 'posted' ? "POSTED" : "DRAFT";
  
  if (type === 'receipt') voucherTitle = "RECEIPT VOUCHER";
  if (type === 'journal') voucherTitle = "JOURNAL VOUCHER";
  if (type === 'purchase') voucherTitle = "PURCHASE VOUCHER";
  if (type === 'invoice') voucherTitle = "SALES VOUCHER";

  const statusColor = (status === "POSTED" || status === "PAID") ? "#059669" : "#d97706";
  
  let voucherLines: any[] = [];
  let totalDr = 0;
  let totalCr = 0;

  // Helper to format ledger as "Code - Name"
  const formatLedger = (line: any) => {
    if (line.ledger && typeof line.ledger === 'object') {
      const code = line.ledger.accountCode || line.ledger.code;
      const name = line.ledger.accountName || line.ledger.name;
      if (code && name) return `${code} - ${name}`;
      return name || code || '—';
    }
    if (line.ledgerName) return line.ledgerName;
    if (line.ledger && isNaN(Number(line.ledger))) return line.ledger;
    return line.ledgerId || line.ledger || '—';
  };

  if (type === 'payment' || type === 'receipt' || type === 'journal') {
    let details = data.details || [];
    if (typeof details === 'string') {
      try { details = JSON.parse(details); } catch(e) {}
    }

    voucherLines = (details || []).map((line: any) => {
      const isDr = line.drCr === 'Dr' || (line.debitAmount > 0);
      const amount = parseFloat(line.amount || line.debitAmount || line.creditAmount || 0);
      return {
        particular: line.particular || line.narration || data.narration || '—',
        ledger: formatLedger(line),
        debit: isDr ? amount : 0,
        credit: !isDr ? amount : 0
      };
    });
  } else if (type === 'purchase') {
    const subtotal = Number(data.subtotal || 0);
    const taxAmount = Number(data.taxAmount || 0);
    const totalAmount = Number(data.totalAmount || 0);

    // 1. Debit Expense/Assets (Item lines)
    let items = data.lineItems || data.items || [];
    if (typeof items === 'string') {
      try { items = JSON.parse(items); } catch(e) {}
    }
    
    items.forEach((item: any) => {
      voucherLines.push({
        particular: item.description || item.itemName || item.item?.itemName || 'Purchase Item',
        ledger: formatLedger(item),
        debit: parseFloat(item.amount || item.subtotal || item.total || 0),
        credit: 0
      });
    });

    // 2. Debit VAT Input
    if (taxAmount > 0) {
      voucherLines.push({
        particular: `VAT Input (${data.taxRate || 5}%)`,
        ledger: '5001 - VAT Input',
        debit: taxAmount,
        credit: 0
      });
    }

    // 3. Credit Vendor
    voucherLines.push({
      particular: data.vendor?.vendorName || 'Vendor',
      ledger: '2001 - Accounts Payable',
      debit: 0,
      credit: totalAmount
    });
  } else if (type === 'invoice') {
    const subtotal = Number(data.subtotal || 0);
    const taxAmount = Number(data.taxAmount || 0);
    const totalAmount = Number(data.totalAmount || 0);

    // 1. Debit Customer (Accounts Receivable)
    voucherLines.push({
      particular: data.tenant?.name || data.customer?.name || 'Customer',
      ledger: '1002 - Accounts Receivable',
      debit: totalAmount,
      credit: 0
    });

    // 2. Credit Revenue (Item lines)
    let items = data.items || [];
    if (typeof items === 'string') {
      try { items = JSON.parse(items); } catch(e) {}
    }
    
    if (items.length > 0) {
      items.forEach((item: any) => {
        voucherLines.push({
          particular: item.description || item.itemName || 'Service/Rent',
          ledger: formatLedger(item) || '4001 - Rental Income',
          debit: 0,
          credit: parseFloat(item.amount || item.subtotal || 0)
        });
      });
    } else {
      voucherLines.push({
        particular: data.description || 'Sales Revenue',
        ledger: '4001 - Rental Income',
        debit: 0,
        credit: subtotal
      });
    }

    // 3. Credit VAT Output
    if (taxAmount > 0) {
      voucherLines.push({
        particular: `VAT Output (${data.taxRate || 5}%)`,
        ledger: '2002 - VAT Output',
        debit: 0,
        credit: taxAmount
      });
    }
  }

  voucherLines.forEach(line => {
    totalDr += line.debit;
    totalCr += line.credit;
  });

  let rowsHtml = voucherLines.map(line => `
    <tr>
      <td style="padding: 10px; border: 1px solid #e2e8f0;">${line.particular}</td>
      <td style="padding: 10px; border: 1px solid #e2e8f0;">${line.ledger}</td>
      <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: right;">${line.debit > 0 ? line.debit.toFixed(2) : ''}</td>
      <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: right;">${line.credit > 0 ? line.credit.toFixed(2) : ''}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${voucherTitle} - ${voucherNo}</title>
      <style>
        @media print {
          @page { size: A4; margin: 0; }
          body { margin: 0; }
        }
        body { font-family: 'Inter', Arial, sans-serif; font-size: 13px; line-height: 1.4; color: #1e293b; margin: 0; background: #fff; }
        .page { width: 210mm; min-height: 297mm; box-sizing: border-box; padding: 14mm 14mm 34mm; position: relative; }
        .voucher-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 2px solid #334155; padding-bottom: 15px; }
        .voucher-title { font-size: 22px; font-weight: 800; color: #0f172a; margin: 0; }
        .status-badge { display: inline-block; padding: 4px 12px; border-radius: 4px; border: 2px solid ${statusColor}; color: ${statusColor}; font-weight: 800; font-size: 16px; margin-top: 5px; }
        .header-right { text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 8px; }
        .logo { max-width: 120px; max-height: 64px; object-fit: contain; display: block; }
        .info-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .info-table td { padding: 5px 0; vertical-align: top; }
        .label { font-weight: 700; color: #475569; width: 120px; }
        .main-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        .main-table th { background-color: #f1f5f9; padding: 10px; border: 1px solid #cbd5e1; text-align: left; }
        .footer-signatures { position: absolute; left: 14mm; right: 14mm; bottom: 12mm; }
        .signature-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        .signature-box { border-top: 1px solid #334155; padding-top: 8px; text-align: center; font-weight: 600; font-size: 11px; min-height: 32px; }
        .footer-note { text-align: center; font-size: 10px; color: #94a3b8; margin-top: 10px; }
      </style>
    </head>
    <body>
      <div class="page">
        <div class="voucher-header">
          <div>
            <div style="font-weight: 800; font-size: 16px; color: #334155;">${companyInfo.name}</div>
            <div style="color: #64748b; font-size: 11px;">${companyInfo.address} | ${companyInfo.phone}</div>
          </div>
          <div class="header-right">
            <img class="logo" src="${logoUrl}" alt="Company Logo" />
            <h1 class="voucher-title">${voucherTitle}</h1>
            <div class="status-badge">${status}</div>
          </div>
        </div>

        <table class="info-table">
          <tr>
            <td class="label">Voucher No:</td>
            <td>${voucherNo}</td>
            <td class="label">Date:</td>
            <td>${new Date(date).toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
          </tr>
          <tr>
            <td class="label">${type === 'purchase' ? 'Vendor:' : (type === 'journal' ? 'Reference:' : 'Entity:')}</td>
            <td colspan="3">${paidTo}</td>
          </tr>
          <tr>
            <td class="label">Narrations:</td>
            <td colspan="3">${narration}</td>
          </tr>
        </table>

        <table class="main-table">
          <thead>
            <tr>
              <th>Particulars</th>
              <th style="width: 200px;">Account Head (Ledger)</th>
              <th style="width: 120px; text-align: right;">Debit (AED)</th>
              <th style="width: 120px; text-align: right;">Credit (AED)</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
            <tr style="font-weight: 800; background-color: #f8fafc;">
              <td colspan="2" style="padding: 10px; border: 1px solid #e2e8f0; text-align: right;">TOTAL</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: right;">${totalDr.toFixed(2)}</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: right;">${totalCr.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        <div style="margin-bottom: 40px;">
          <span class="label">Amount in Words:</span> 
          <span style="font-style: italic; text-transform: capitalize;">AED ${totalDr.toFixed(2)} Only</span>
        </div>

        <div class="footer-signatures">
          <div class="signature-grid">
            <div class="signature-box">Prepared By</div>
            <div class="signature-box">Verified By</div>
            <div class="signature-box">Approved By</div>
          </div>
          <div class="footer-note">Generated by Emirates Lease Flow</div>
        </div>
      </div>

      <script>
        window.onload = () => { 
          window.print(); 
          setTimeout(() => { window.close(); }, 500);
        }
      </script>
    </body>
    </html>
  `;
};

export const generatePurchaseInvoiceHtml = (pi: any) => {
  let lineItemsHtml = '';
  let items = pi.lineItems || [];
  if (typeof items === 'string') {
    try {
      items = JSON.parse(items);
    } catch (e) {
      console.error('Failed to parse line items', e);
    }
  }

  items.forEach((item: any, index: number) => {
    const qty = parseFloat(item.quantity || 0);
    const price = parseFloat(item.unit_price || 0);
    const subtotal = parseFloat(item.subtotal || 0) || qty * price;
    const tax = parseFloat(item.tax_amount || 0);
    const total = parseFloat(item.total || 0) || subtotal + tax;
    const itemName = item.item?.itemName || item.itemName || 'Unknown Item';

    lineItemsHtml += `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${index + 1}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${itemName}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${qty}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${price.toFixed(2)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${subtotal.toFixed(2)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${tax.toFixed(2)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${total.toFixed(2)}</td>
      </tr>
    `;
  });

  const companyInfo = pi.companyInfo || {
    name: "Emirates Lease Flow",
    address: "Dubai, UAE",
    phone: "+971 4 000 0000",
    email: "info@emirateslease.ae",
    vatNumber: "100123456789123"
  };
  const logoUrl = pi.companyInfo?.logoUrl || `${window.location.origin}/withyoulogo.png`;

  return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Purchase Invoice - ${pi.invoiceNumber}</title>
        <style>
            @media print {
                @page { size: A4; margin: 0; }
                body { margin: 0; }
            }
            body { font-family: 'Inter', Arial, sans-serif; font-size: 14px; line-height: 1.5; color: #333; margin: 0; background: #fff; }
            .page { width: 210mm; min-height: 297mm; box-sizing: border-box; padding: 12mm 14mm 34mm; position: relative; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #3b82f6; padding-bottom: 14px; margin-bottom: 24px; }
            .title { font-size: 28px; font-weight: 800; color: #1e40af; margin: 0; }
            .header-right { text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 8px; }
            .logo { max-width: 120px; max-height: 64px; object-fit: contain; display: block; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; margin-bottom: 24px; }
            .label { font-weight: 600; width: 140px; display: inline-block; color: #64748b; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
            th { text-align: left; background-color: #f8fafc; padding: 10px; border-bottom: 2px solid #e2e8f0; font-weight: 700; color: #475569; }
            td { padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; vertical-align: top; }
            .totals-section { display: flex; justify-content: flex-end; }
            .totals-table { width: 300px; }
            .totals-table td { padding: 5px 10px; }
            .totals-table .total-row { font-weight: 800; border-top: 2px solid #3b82f6; font-size: 16px; color: #1e40af; }
            .footer-signatures { position: absolute; left: 14mm; right: 14mm; bottom: 12mm; }
            .signature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; align-items: end; }
            .signature-box { text-align: center; border-top: 1px solid #94a3b8; padding-top: 10px; font-weight: 600; min-height: 32px; }
            .footer-note { text-align: center; font-size: 10px; color: #94a3b8; margin-top: 10px; }
        </style>
    </head>
    <body>
        <div class="page">
            <div class="header">
                <div>
                  <h1 class="title">PURCHASE INVOICE</h1>
                  <p style="margin: 5px 0 0 0; color: #64748b; font-weight: 600;"># ${pi.invoiceNumber}</p>
                </div>
                <div class="header-right">
                  <img class="logo" src="${logoUrl}" alt="Company Logo" />
                  <div style="font-weight: 800; font-size: 18px; color: #1e40af;">${companyInfo.name}</div>
                  <div style="color: #64748b;">${companyInfo.address}</div>
                  <div style="color: #64748b;">${companyInfo.phone}${companyInfo.email ? ` | ${companyInfo.email}` : ''}</div>
                  <div style="color: #64748b;">TRN: ${companyInfo.vatNumber}</div>
                </div>
            </div>

            <div class="info-grid">
                <div>
                    <div style="font-weight: 700; margin-bottom: 10px; color: #1e40af; text-transform: uppercase; font-size: 12px; letter-spacing: 1px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px;">Bill To</div>
                    ${pi.deliveryAddress ? `<div>${pi.deliveryAddress}</div>` : `<div>${companyInfo.name}</div>`}
                    <div style="margin-top: 10px; color: #475569; font-size: 13px;">
                       ${pi.deliveryContactName ? `<div><span class="label">Attn:</span> ${pi.deliveryContactName}</div>` : ''}
                       ${pi.deliveryContactPhone ? `<div><span class="label">Ph:</span> ${pi.deliveryContactPhone}</div>` : ''}
                    </div>
                </div>
                <div>
                     <div style="font-weight: 700; margin-bottom: 10px; color: #1e40af; text-transform: uppercase; font-size: 12px; letter-spacing: 1px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px;">Vendor Details</div>
                     <div style="font-weight: 700; font-size: 16px;">${pi.vendor?.vendorName || 'N/A'}</div>
                     <div style="margin-top: 10px; color: #475569; font-size: 13px;">
                        <div><span class="label">Supplier Ref:</span> ${pi.supplierInvoiceNumber || 'N/A'}</div>
                        <div><span class="label">PO Number:</span> ${pi.purchaseOrder?.poNumber || 'N/A'}</div>
                        <div><span class="label">Ph:</span> ${pi.vendor?.phone || ''}</div>
                     </div>
                </div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th style="width: 40px;">#</th>
                        <th>Item Description</th>
                        <th style="text-align: center; width: 60px;">Qty</th>
                        <th style="text-align: right; width: 100px;">Unit Price</th>
                        <th style="text-align: right; width: 100px;">Subtotal</th>
                        <th style="text-align: right; width: 90px;">Tax</th>
                        <th style="text-align: right; width: 110px;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${lineItemsHtml}
                </tbody>
            </table>

            <div class="totals-section">
                <table class="totals-table">
                    <tr>
                        <td style="color: #64748b;">Subtotal</td>
                        <td style="text-align: right; font-weight: 600;">${parseFloat(pi.subtotal || 0).toFixed(2)}</td>
                    </tr>
                    ${pi.discountValue > 0 ? `
                    <tr>
                        <td style="color: #64748b;">Discount</td>
                        <td style="text-align: right; color: #ef4444; font-weight: 600;">- ${parseFloat(pi.discountValue).toFixed(2)}</td>
                    </tr>` : ''}
                    <tr>
                        <td style="color: #64748b;">Tax (VAT)</td>
                        <td style="text-align: right; font-weight: 600;">${parseFloat(pi.taxAmount || 0).toFixed(2)}</td>
                    </tr>
                    <tr class="total-row">
                        <td>TOTAL AMOUNT</td>
                        <td style="text-align: right;">${parseFloat(pi.totalAmount || 0).toFixed(2)} AED</td>
                    </tr>
                </table>
            </div>

            ${pi.notes ? `
            <div style="margin-top: 24px; padding: 15px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
                <strong style="color: #1e40af; font-size: 12px; text-transform: uppercase;">Notes:</strong>
                <div style="margin-top: 5px; color: #475569; font-size: 13px;">${pi.notes}</div>
            </div>
            ` : ''}

            <div class="footer-signatures">
                <div class="signature-grid">
                    <div class="signature-box">Prepared By</div>
                    <div class="signature-box">Authorized Signature</div>
                </div>
                <div class="footer-note">Generated by Emirates Lease Flow</div>
            </div>
        </div>

        <script>
            window.onload = function() { 
                window.print();
                setTimeout(() => { window.close(); }, 500);
            }
        </script>
    </body>
    </html>
  `;
};

function escHtml(s: unknown): string {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtDate(d: unknown): string {
  if (!d) return "—";
  return String(d).slice(0, 10);
}

function fmtAmt(n: unknown): string {
  return (parseFloat(String(n ?? 0)) || 0).toFixed(2);
}

export const generateDirectPurchaseInvoiceHtml = (dpi: any) => {
  const companyInfo = dpi.companyInfo || defaultCompanyBranding;
  const vendor = dpi.vendor || {};
  const lines = dpi.lines || [];
  const currency = dpi.currency || "AED";

  let lineItemsHtml = "";
  lines.forEach((line: any, index: number) => {
    const amount = parseFloat(line.amount ?? 0) || 0;
    const taxRate = parseFloat(line.taxRate ?? line.tax_rate ?? 0) || 0;
    const taxAmount = parseFloat(line.taxAmount ?? line.tax_amount ?? 0) || 0;
    const lineTotal =
      parseFloat(line.totalAmount ?? line.total_amount ?? 0) || amount + taxAmount;
    const acc = line.expenseAccount || {};
    const accountLabel = acc.accountCode
      ? `${acc.accountCode} — ${acc.accountName || ""}`
      : "—";
    const vatAcc = line.inputTaxAccount || {};
    const vatLabel =
      taxAmount > 0
        ? vatAcc.accountCode
          ? `${vatAcc.accountCode} — ${vatAcc.accountName || ""}`
          : "—"
        : "—";

    lineItemsHtml += `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: center;">${index + 1}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${escHtml(accountLabel)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${escHtml(vatLabel)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${escHtml(line.description || "—")}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right;">${fmtAmt(amount)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: center;">${taxRate.toFixed(2)}%</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right;">${fmtAmt(taxAmount)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 600;">${fmtAmt(lineTotal)}</td>
      </tr>
    `;
  });

  const entries = dpi.accountingEntries || [];
  let ledgerHtml = "";
  if (entries.length > 0) {
    entries.forEach((e: any) => {
      const ledger = e.ledger || {};
      const label = ledger.accountCode
        ? `${ledger.accountCode} — ${ledger.accountName || ""}`
        : "—";
      const dr = parseFloat(e.debitAmount ?? e.debit_amount ?? 0) || 0;
      const cr = parseFloat(e.creditAmount ?? e.credit_amount ?? 0) || 0;
      ledgerHtml += `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${escHtml(e.narration || e.description || "—")}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${escHtml(label)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right;">${dr > 0 ? fmtAmt(dr) : ""}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right;">${cr > 0 ? fmtAmt(cr) : ""}</td>
        </tr>
      `;
    });
  }

  const status = escHtml((dpi.status || "DRAFT").toUpperCase());
  const creator = dpi.creator?.name || dpi.creator?.email || "—";
  const postedAt = dpi.postedAt ? fmtDate(dpi.postedAt) : "—";
  const payableAcc = dpi.payableAccount || {};
  const payableLabel = payableAcc.accountCode
    ? `${payableAcc.accountCode} — ${payableAcc.accountName || ""}`
    : "—";

  return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Direct Purchase Invoice - ${escHtml(dpi.dpiNumber || "Draft")}</title>
        <style>
            @media print {
                @page { size: A4; margin: 12mm; }
            }
            body { font-family: 'Inter', Arial, sans-serif; font-size: 13px; line-height: 1.5; color: #334155; margin: 0; padding: 24px; }
            .header { display: flex; justify-content: space-between; border-bottom: 3px solid #3b82f6; padding-bottom: 16px; margin-bottom: 24px; }
            .title { font-size: 24px; font-weight: 800; color: #1e40af; margin: 0; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; }
            .section-title { font-weight: 700; margin-bottom: 8px; color: #1e40af; text-transform: uppercase; font-size: 11px; letter-spacing: 1px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
            .label { font-weight: 600; color: #64748b; display: inline-block; min-width: 130px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th { text-align: left; background-color: #f8fafc; padding: 10px; border-bottom: 2px solid #e2e8f0; font-weight: 700; color: #475569; font-size: 11px; text-transform: uppercase; }
            .totals-table { width: 280px; margin-left: auto; }
            .totals-table td { padding: 4px 8px; }
            .total-row td { font-weight: 800; border-top: 2px solid #3b82f6; font-size: 15px; color: #1e40af; padding-top: 8px; }
            .status-badge { display: inline-block; padding: 4px 10px; border-radius: 4px; background: #e2e8f0; font-weight: 700; font-size: 11px; }
            .footer { margin-top: 48px; display: flex; justify-content: space-between; gap: 16px; }
            .signature-box { text-align: center; flex: 1; border-top: 1px solid #94a3b8; padding-top: 8px; font-weight: 600; font-size: 12px; }
            .branding { text-align: center; font-size: 10px; color: #94a3b8; margin-top: 40px; }
            .meta-row { margin-bottom: 4px; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="header">
            <div>
              <h1 class="title">DIRECT PURCHASE INVOICE</h1>
              <p style="margin: 4px 0 0 0; color: #64748b; font-weight: 600;"># ${escHtml(dpi.dpiNumber || "DRAFT")}</p>
              <span class="status-badge">${status}</span>
            </div>
            <div style="text-align: right;">
              <div style="font-weight: 800; font-size: 16px; color: #1e40af;">${escHtml(companyInfo.name)}</div>
              ${companyInfo.address ? `<div style="color: #64748b;">${escHtml(companyInfo.address)}</div>` : ""}
              ${companyInfo.phone ? `<div style="color: #64748b;">Tel: ${escHtml(companyInfo.phone)}</div>` : ""}
              ${companyInfo.email ? `<div style="color: #64748b;">${escHtml(companyInfo.email)}</div>` : ""}
              ${companyInfo.vatNumber ? `<div style="color: #64748b;">TRN: ${escHtml(companyInfo.vatNumber)}</div>` : ""}
            </div>
        </div>

        <div class="info-grid">
            <div>
                <div class="section-title">Vendor (Supplier)</div>
                <div style="font-weight: 700; font-size: 15px;">${escHtml(vendor.vendorName || "—")}</div>
                <div class="meta-row"><span class="label">TRN:</span> ${escHtml(vendor.trn || "—")}</div>
                <div class="meta-row"><span class="label">Contact:</span> ${escHtml(vendor.contactPerson || "—")}</div>
                <div class="meta-row"><span class="label">Phone:</span> ${escHtml(vendor.phone || "—")}</div>
                <div class="meta-row"><span class="label">Email:</span> ${escHtml(vendor.email || "—")}</div>
                <div class="meta-row"><span class="label">Address:</span> ${escHtml(vendor.address || "—")}</div>
                <div class="meta-row"><span class="label">Payment terms:</span> ${escHtml(vendor.paymentTerms || "—")}</div>
            </div>
            <div>
                <div class="section-title">Invoice information</div>
                <div class="meta-row"><span class="label">Invoice date:</span> ${fmtDate(dpi.invoiceDate)}</div>
                <div class="meta-row"><span class="label">Due date:</span> ${fmtDate(dpi.dueDate)}</div>
                <div class="meta-row"><span class="label">Supplier invoice no.:</span> ${escHtml(dpi.supplierInvoiceNo || "—")}</div>
                <div class="meta-row"><span class="label">Supplier invoice date:</span> ${fmtDate(dpi.supplierInvoiceDate)}</div>
                <div class="meta-row"><span class="label">Currency:</span> ${escHtml(currency)}</div>
                <div class="meta-row"><span class="label">Transaction no.:</span> ${escHtml(dpi.transactionNo ?? "—")}</div>
                <div class="meta-row"><span class="label">Created by:</span> ${escHtml(creator)}</div>
                <div class="meta-row"><span class="label">Posted at:</span> ${postedAt}</div>
                <div class="meta-row"><span class="label">Vendor payable (Cr):</span> ${escHtml(payableLabel)}</div>
            </div>
        </div>

        <div class="section-title" style="margin-bottom: 8px;">Expense lines</div>
        <table>
            <thead>
                <tr>
                    <th style="width: 32px; text-align: center;">#</th>
                    <th style="width: 140px;">Expense (Dr)</th>
                    <th style="width: 140px;">Input VAT (Dr)</th>
                    <th>Description</th>
                    <th style="text-align: right; width: 90px;">Amount</th>
                    <th style="text-align: center; width: 56px;">VAT %</th>
                    <th style="text-align: right; width: 80px;">VAT</th>
                    <th style="text-align: right; width: 90px;">Total</th>
                </tr>
            </thead>
            <tbody>
                ${lineItemsHtml || '<tr><td colspan="8" style="padding:12px;text-align:center;color:#94a3b8;">No lines</td></tr>'}
            </tbody>
        </table>

        <table class="totals-table">
            <tr><td style="color:#64748b;">Subtotal (excl. VAT)</td><td style="text-align:right;font-weight:600;">${fmtAmt(dpi.subtotalAmount)} ${currency}</td></tr>
            <tr><td style="color:#64748b;">VAT</td><td style="text-align:right;font-weight:600;">${fmtAmt(dpi.taxAmount)} ${currency}</td></tr>
            <tr class="total-row"><td>Total</td><td style="text-align:right;">${fmtAmt(dpi.totalAmount)} ${currency}</td></tr>
            <tr><td style="color:#64748b;">Paid</td><td style="text-align:right;">${fmtAmt(dpi.paidAmount)} ${currency}</td></tr>
            <tr><td style="color:#64748b;">Outstanding</td><td style="text-align:right;font-weight:700;">${fmtAmt(dpi.outstandingAmount)} ${currency}</td></tr>
        </table>

        ${dpi.description ? `
        <div style="margin-top: 24px; padding: 12px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0;">
            <strong style="color:#1e40af;font-size:11px;text-transform:uppercase;">Description / Notes</strong>
            <div style="margin-top:6px;color:#475569;">${escHtml(dpi.description)}</div>
        </div>
        ` : ""}

        ${ledgerHtml ? `
        <div style="margin-top: 28px;">
            <div class="section-title">Ledger posting (accounts_trans)</div>
            <table>
                <thead>
                    <tr>
                        <th>Narration</th>
                        <th>Account</th>
                        <th style="text-align:right;width:100px;">Debit</th>
                        <th style="text-align:right;width:100px;">Credit</th>
                    </tr>
                </thead>
                <tbody>${ledgerHtml}</tbody>
            </table>
        </div>
        ` : ""}

        <div class="footer">
            <div class="signature-box">Prepared By</div>
            <div class="signature-box">Verified By</div>
            <div class="signature-box">Approved By</div>
        </div>

        <div class="branding">Generated by Emirates Lease Flow — Direct Purchase Invoice</div>

        <script>
            window.onload = function() {
                window.print();
                setTimeout(() => { window.close(); }, 500);
            }
        </script>
    </body>
    </html>
  `;
};

function accountLabel(acc: any, fallbackId?: unknown): string {
  if (acc?.accountCode) {
    return `${acc.accountCode} — ${acc.accountName || ""}`.trim();
  }
  if (fallbackId != null && fallbackId !== "") return String(fallbackId);
  return "—";
}

/**
 * Detailed prepaid expense print: header, GLs, KPIs, full recognition schedule,
 * allocations, linked journal vouchers, amendments, and signature block.
 */
export const generatePrepaidExpenseHtml = (prepaid: any) => {
  const companyInfo = prepaid.companyInfo || defaultCompanyBranding;
  const currency = prepaid.currencyCode || prepaid.currency || "AED";
  const schedule = Array.isArray(prepaid.scheduleLines) ? [...prepaid.scheduleLines] : [];
  schedule.sort(
    (a, b) => (Number(a.lineNumber) || 0) - (Number(b.lineNumber) || 0)
  );
  const allocations = prepaid.allocations || [];
  const amendments = prepaid.amendments || [];
  const reconciliations = prepaid.reconciliations || [];

  const start = fmtDate(prepaid.serviceStartDate);
  const end = fmtDate(prepaid.serviceEndDate);
  const status = escHtml((prepaid.status || "DRAFT").replace(/_/g, " "));
  const approval = escHtml((prepaid.approvalStatus || "—").replace(/_/g, " "));
  const method = escHtml((prepaid.recognitionMethod || "—").replace(/_/g, " "));
  const postingMode = escHtml((prepaid.postingMode || "—").replace(/_/g, " "));

  const prepaidAsset = accountLabel(prepaid.prepaidAssetAccount, prepaid.prepaidAssetAccountId);
  const expenseGl = accountLabel(prepaid.expenseAccount, prepaid.expenseAccountId);
  const creditGl = accountLabel(prepaid.creditAccount, prepaid.creditAccountId);

  let scheduleHtml = "";
  let scheduleDays = 0;
  let scheduleAmount = 0;
  schedule.forEach((line: any) => {
    const days = parseInt(String(line.serviceDays ?? 0), 10) || 0;
    const amt = parseFloat(String(line.scheduledAmount ?? 0)) || 0;
    scheduleDays += days;
    scheduleAmount += amt;
    const jv =
      line.journalVoucherNumber ||
      (line.journalVoucherId ? `#${line.journalVoucherId}` : "—");
    scheduleHtml += `
      <tr>
        <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0; text-align: center;">${escHtml(line.lineNumber)}</td>
        <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0;">${escHtml(line.recognitionMonth || "—")}</td>
        <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0;">${fmtDate(line.periodStartDate)} — ${fmtDate(line.periodEndDate)}</td>
        <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0; text-align: center;">${days}</td>
        <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-variant-numeric: tabular-nums;">${fmtAmt(amt)}</td>
        <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-variant-numeric: tabular-nums;">${fmtAmt(line.cumulativeRecognizedAmount)}</td>
        <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-variant-numeric: tabular-nums;">${fmtAmt(line.remainingBalanceAfterLine)}</td>
        <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0;">${escHtml((line.postingStatus || "—").replace(/_/g, " "))}</td>
        <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0; font-family: ui-monospace, monospace; font-size: 11px;">${escHtml(jv)}</td>
      </tr>
    `;
  });

  let allocationHtml = "";
  allocations.forEach((row: any, index: number) => {
    allocationHtml += `
      <tr>
        <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0; text-align: center;">${index + 1}</td>
        <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0;">${escHtml((row.allocationType || "CUSTOM").replace(/_/g, " "))}</td>
        <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0;">${escHtml(row.description || "—")}</td>
        <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0; text-align: right;">${fmtAmt(row.allocationPercentage)}%</td>
        <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0; text-align: right;">${fmtAmt(row.allocationAmount)}</td>
        <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0;">${escHtml(accountLabel(row.expenseAccount, row.expenseAccountId))}</td>
      </tr>
    `;
  });

  let amendmentHtml = "";
  amendments.forEach((row: any) => {
    amendmentHtml += `
      <tr>
        <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0;">${escHtml(row.amendmentNumber || row.id)}</td>
        <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0;">${escHtml((row.amendmentType || "—").replace(/_/g, " "))}</td>
        <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0;">${fmtDate(row.effectiveDate)}</td>
        <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0;">${escHtml((row.status || "—").replace(/_/g, " "))}</td>
        <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0;">${escHtml(row.reason || "—")}</td>
      </tr>
    `;
  });

  let reconHtml = "";
  reconciliations.forEach((row: any) => {
    reconHtml += `
      <tr>
        <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0;">${fmtDate(row.reconciliationDate)}</td>
        <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0; text-align: right;">${fmtAmt(row.remainingSubledgerBalance ?? row.scheduleBalance)}</td>
        <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0; text-align: right;">${fmtAmt(row.prepaidGlBalance)}</td>
        <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0; text-align: right;">${fmtAmt(row.differenceAmount)}</td>
        <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0;">${escHtml((row.status || "—").replace(/_/g, " "))}</td>
      </tr>
    `;
  });

  const jvLinks = schedule
    .filter((l: any) => l.journalVoucherId || l.journalVoucherNumber)
    .map((l: any) => {
      return `
        <tr>
          <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0; text-align: center;">${escHtml(l.lineNumber)}</td>
          <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0; font-family: ui-monospace, monospace;">${escHtml(l.journalVoucherNumber || `#${l.journalVoucherId}`)}</td>
          <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0;">${escHtml((l.postingStatus || "—").replace(/_/g, " "))}</td>
          <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0; text-align: right;">${fmtAmt(l.scheduledAmount)}</td>
          <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0;">${fmtDate(l.postedAt || l.recognitionDate || l.periodEndDate)}</td>
        </tr>
      `;
    })
    .join("");

  const categoryName = prepaid.category?.categoryName || prepaid.category?.category_name || "—";
  const vendorName =
    prepaid.vendor?.vendorName ||
    prepaid.vendor?.name ||
    prepaid.supplier?.vendorName ||
    "—";

  return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Prepaid Expense - ${escHtml(prepaid.prepaidNumber || "Draft")}</title>
        <style>
            @media print {
                @page { size: A4; margin: 12mm; }
                .no-print { display: none !important; }
            }
            body { font-family: 'Inter', Arial, sans-serif; font-size: 12.5px; line-height: 1.45; color: #334155; margin: 0; padding: 22px; }
            .header { display: flex; justify-content: space-between; gap: 16px; border-bottom: 3px solid #0f766e; padding-bottom: 14px; margin-bottom: 20px; }
            .title { font-size: 22px; font-weight: 800; color: #115e59; margin: 0; letter-spacing: 0.02em; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 18px; }
            .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 0 0 20px 0; }
            .kpi { background: #f0fdfa; border: 1px solid #ccfbf1; border-radius: 6px; padding: 10px 12px; }
            .kpi .k { font-size: 10px; font-weight: 700; color: #0f766e; text-transform: uppercase; letter-spacing: 0.06em; }
            .kpi .v { font-size: 16px; font-weight: 800; color: #134e4a; margin-top: 4px; font-variant-numeric: tabular-nums; }
            .section-title { font-weight: 700; margin: 22px 0 8px; color: #115e59; text-transform: uppercase; font-size: 11px; letter-spacing: 1px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
            .label { font-weight: 600; color: #64748b; display: inline-block; min-width: 140px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
            th { text-align: left; background-color: #f8fafc; padding: 8px; border-bottom: 2px solid #e2e8f0; font-weight: 700; color: #475569; font-size: 10px; text-transform: uppercase; }
            .status-badge { display: inline-block; padding: 3px 9px; border-radius: 4px; background: #ccfbf1; color: #115e59; font-weight: 700; font-size: 11px; }
            .footer { margin-top: 40px; display: flex; justify-content: space-between; gap: 14px; page-break-inside: avoid; }
            .signature-box { text-align: center; flex: 1; border-top: 1px solid #94a3b8; padding-top: 8px; font-weight: 600; font-size: 11px; }
            .branding { text-align: center; font-size: 10px; color: #94a3b8; margin-top: 28px; }
            .meta-row { margin-bottom: 3px; font-size: 12px; }
            .muted { color: #94a3b8; font-style: italic; padding: 10px 0; }
            .notes { margin-top: 12px; padding: 10px 12px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0; }
        </style>
    </head>
    <body>
        <div class="header">
            <div>
              <h1 class="title">PREPAID EXPENSE</h1>
              <p style="margin: 4px 0 6px 0; color: #64748b; font-weight: 700; font-family: ui-monospace, monospace;"># ${escHtml(prepaid.prepaidNumber || "DRAFT")}</p>
              <span class="status-badge">${status}</span>
            </div>
            <div style="text-align: right;">
              <div style="font-weight: 800; font-size: 15px; color: #115e59;">${escHtml(companyInfo.name)}</div>
              ${companyInfo.address ? `<div style="color: #64748b;">${escHtml(companyInfo.address)}</div>` : ""}
              ${companyInfo.phone ? `<div style="color: #64748b;">Tel: ${escHtml(companyInfo.phone)}</div>` : ""}
              ${companyInfo.email ? `<div style="color: #64748b;">${escHtml(companyInfo.email)}</div>` : ""}
              ${companyInfo.vatNumber ? `<div style="color: #64748b;">TRN: ${escHtml(companyInfo.vatNumber)}</div>` : ""}
              <div style="color: #94a3b8; font-size: 11px; margin-top: 6px;">Printed: ${escHtml(new Date().toLocaleString("en-AE"))}</div>
            </div>
        </div>

        <div class="kpi-grid">
            <div class="kpi"><div class="k">Total amount</div><div class="v">${fmtAmt(prepaid.totalAmount)} ${escHtml(currency)}</div></div>
            <div class="kpi"><div class="k">Recognized</div><div class="v">${fmtAmt(prepaid.recognizedAmount)} ${escHtml(currency)}</div></div>
            <div class="kpi"><div class="k">Remaining</div><div class="v">${fmtAmt(prepaid.remainingAmount ?? prepaid.totalAmount)} ${escHtml(currency)}</div></div>
            <div class="kpi"><div class="k">Daily rate</div><div class="v">${escHtml(Number(prepaid.dailyRate ?? 0).toFixed(6))}</div></div>
        </div>

        <div class="info-grid">
            <div>
                <div class="section-title" style="margin-top:0;">Document</div>
                <div class="meta-row"><span class="label">Description:</span> ${escHtml(prepaid.description || "—")}</div>
                <div class="meta-row"><span class="label">Category:</span> ${escHtml(categoryName)}</div>
                <div class="meta-row"><span class="label">Vendor / supplier:</span> ${escHtml(vendorName)}</div>
                <div class="meta-row"><span class="label">Source type:</span> ${escHtml((prepaid.sourceType || "MANUAL").replace(/_/g, " "))}</div>
                <div class="meta-row"><span class="label">Source document:</span> ${escHtml(prepaid.sourceDocumentNumber || prepaid.sourceDocumentId || "—")}</div>
                <div class="meta-row"><span class="label">Approval status:</span> ${approval}</div>
                <div class="meta-row"><span class="label">Schedule status:</span> ${escHtml((prepaid.scheduleStatus || "—").replace(/_/g, " "))}</div>
            </div>
            <div>
                <div class="section-title" style="margin-top:0;">Service &amp; recognition</div>
                <div class="meta-row"><span class="label">Service period:</span> ${start} — ${end}</div>
                <div class="meta-row"><span class="label">Service days:</span> ${escHtml(prepaid.totalServiceDays ?? "—")}</div>
                <div class="meta-row"><span class="label">Recognition method:</span> ${method}</div>
                <div class="meta-row"><span class="label">Posting mode:</span> ${postingMode}</div>
                <div class="meta-row"><span class="label">Exchange rate:</span> ${escHtml(prepaid.exchangeRate ?? 1)}</div>
                <div class="meta-row"><span class="label">Base amount:</span> ${fmtAmt(prepaid.baseCurrencyAmount ?? prepaid.totalAmount)} ${escHtml(currency)}</div>
            </div>
        </div>

        <div class="section-title">General ledger accounts</div>
        <div class="info-grid">
            <div>
                <div class="meta-row"><span class="label">Prepaid asset (Cr):</span> ${escHtml(prepaidAsset)}</div>
                <div class="meta-row"><span class="label">Expense (Dr):</span> ${escHtml(expenseGl)}</div>
                <div class="meta-row"><span class="label">Optional credit:</span> ${escHtml(creditGl)}</div>
            </div>
            <div>
                <div class="meta-row"><span class="label">Property ID:</span> ${escHtml(prepaid.propertyId ?? "—")}</div>
                <div class="meta-row"><span class="label">Unit ID:</span> ${escHtml(prepaid.unitId ?? "—")}</div>
                <div class="meta-row"><span class="label">Lease ID:</span> ${escHtml(prepaid.leaseId ?? "—")}</div>
                <div class="meta-row"><span class="label">Department / CC:</span> ${escHtml(prepaid.departmentId ?? "—")} / ${escHtml(prepaid.costCenterId ?? "—")}</div>
            </div>
        </div>

        ${prepaid.notes ? `
        <div class="notes">
            <strong style="color:#115e59;font-size:11px;text-transform:uppercase;">Notes</strong>
            <div style="margin-top:4px;color:#475569;">${escHtml(prepaid.notes)}</div>
        </div>
        ` : ""}

        <div class="section-title">Recognition schedule (${schedule.length} lines)</div>
        <table>
            <thead>
                <tr>
                    <th style="width:36px;text-align:center;">#</th>
                    <th style="width:72px;">Month</th>
                    <th>Period</th>
                    <th style="width:48px;text-align:center;">Days</th>
                    <th style="text-align:right;width:88px;">Amount</th>
                    <th style="text-align:right;width:88px;">Cumulative</th>
                    <th style="text-align:right;width:88px;">Remaining</th>
                    <th style="width:100px;">Posting</th>
                    <th style="width:110px;">JV</th>
                </tr>
            </thead>
            <tbody>
                ${scheduleHtml || '<tr><td colspan="9" class="muted" style="text-align:center;padding:14px;">No schedule lines</td></tr>'}
            </tbody>
            ${schedule.length ? `
            <tfoot>
                <tr>
                    <td colspan="3" style="padding:8px;font-weight:700;border-top:2px solid #0f766e;">Totals</td>
                    <td style="padding:8px;text-align:center;font-weight:700;border-top:2px solid #0f766e;">${scheduleDays}</td>
                    <td style="padding:8px;text-align:right;font-weight:800;border-top:2px solid #0f766e;color:#115e59;">${fmtAmt(scheduleAmount)}</td>
                    <td colspan="4" style="border-top:2px solid #0f766e;"></td>
                </tr>
            </tfoot>` : ""}
        </table>

        <div class="section-title">Journal vouchers</div>
        ${jvLinks ? `
        <table>
            <thead>
                <tr>
                    <th style="width:48px;text-align:center;">Line</th>
                    <th>JV number</th>
                    <th style="width:120px;">Status</th>
                    <th style="text-align:right;width:100px;">Amount</th>
                    <th style="width:110px;">Date</th>
                </tr>
            </thead>
            <tbody>${jvLinks}</tbody>
        </table>
        ` : `<div class="muted">No journal vouchers linked yet.</div>`}

        <div class="section-title">Allocations</div>
        ${allocationHtml ? `
        <table>
            <thead>
                <tr>
                    <th style="width:36px;text-align:center;">#</th>
                    <th style="width:110px;">Type</th>
                    <th>Description</th>
                    <th style="text-align:right;width:70px;">%</th>
                    <th style="text-align:right;width:90px;">Amount</th>
                    <th>Expense account</th>
                </tr>
            </thead>
            <tbody>${allocationHtml}</tbody>
        </table>
        ` : `<div class="muted">No cost allocations — full amount posts to the header expense account.</div>`}

        ${amendmentHtml ? `
        <div class="section-title">Amendments</div>
        <table>
            <thead>
                <tr>
                    <th style="width:90px;">Number</th>
                    <th style="width:130px;">Type</th>
                    <th style="width:100px;">Effective</th>
                    <th style="width:100px;">Status</th>
                    <th>Reason</th>
                </tr>
            </thead>
            <tbody>${amendmentHtml}</tbody>
        </table>
        ` : ""}

        ${reconHtml ? `
        <div class="section-title">Reconciliation</div>
        <table>
            <thead>
                <tr>
                    <th style="width:110px;">Date</th>
                    <th style="text-align:right;">Subledger remaining</th>
                    <th style="text-align:right;">GL balance</th>
                    <th style="text-align:right;">Difference</th>
                    <th style="width:140px;">Status</th>
                </tr>
            </thead>
            <tbody>${reconHtml}</tbody>
        </table>
        ` : ""}

        <div class="footer">
            <div class="signature-box">Prepared By</div>
            <div class="signature-box">Reviewed By</div>
            <div class="signature-box">Approved By</div>
            <div class="signature-box">Posted By</div>
        </div>

        <div class="branding">Generated by Emirates Lease Flow — Prepaid Expense Schedule &amp; Posting Detail</div>

        <script>
            window.onload = function() {
                window.print();
                setTimeout(function() { window.close(); }, 500);
            }
        </script>
    </body>
    </html>
  `;
};

/**
 * Detailed lease revenue print: header, GLs, KPIs, full recognition schedule,
 * components, linked journal vouchers, adjustments, reconciliation, and signatures.
 */
export const generateLeaseRevenueHtml = (schedule: any) => {
  const companyInfo = schedule.companyInfo || defaultCompanyBranding;
  const currency = schedule.currencyCode || schedule.currency || "AED";
  const lines = Array.isArray(schedule.scheduleLines) ? [...schedule.scheduleLines] : [];
  lines.sort(
    (a, b) => (Number(a.lineNumber) || 0) - (Number(b.lineNumber) || 0)
  );
  const components = schedule.components || [];
  const adjustments = schedule.adjustments || [];
  const reconciliations = schedule.reconciliations || [];

  const start = fmtDate(schedule.serviceStartDate);
  const end = fmtDate(schedule.serviceEndDate);
  const status = escHtml((schedule.status || "DRAFT").replace(/_/g, " "));
  const approval = escHtml((schedule.approvalStatus || "—").replace(/_/g, " "));
  const method = escHtml((schedule.recognitionMethod || "—").replace(/_/g, " "));
  const postingMode = escHtml((schedule.postingMode || "—").replace(/_/g, " "));
  const revenueModel = escHtml((schedule.revenueModel || "—").replace(/_/g, " "));

  const revenueGl = accountLabel(schedule.revenueAccount, schedule.revenueAccountId);
  const deferredGl = accountLabel(schedule.deferredRevenueAccount, schedule.deferredRevenueAccountId);
  const receivableGl = accountLabel(schedule.receivableAccount, schedule.receivableAccountId);
  const accruedGl = accountLabel(schedule.accruedRevenueAccount, schedule.accruedRevenueAccountId);

  let scheduleHtml = "";
  let scheduleDays = 0;
  let scheduleAmount = 0;
  lines.forEach((line: any) => {
    const days = parseInt(String(line.serviceDays ?? 0), 10) || 0;
    const amt = parseFloat(String(line.scheduledAmount ?? 0)) || 0;
    scheduleDays += days;
    scheduleAmount += amt;
    const jv =
      line.journalVoucherNumber ||
      (line.journalVoucherId ? `#${line.journalVoucherId}` : "—");
    scheduleHtml += `
      <tr>
        <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0; text-align: center;">${escHtml(line.lineNumber)}</td>
        <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0;">${escHtml(line.recognitionMonth || "—")}</td>
        <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0;">${fmtDate(line.periodStartDate)} — ${fmtDate(line.periodEndDate)}</td>
        <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0; text-align: center;">${days}</td>
        <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-variant-numeric: tabular-nums;">${fmtAmt(amt)}</td>
        <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-variant-numeric: tabular-nums;">${fmtAmt(line.cumulativeRecognizedAmount)}</td>
        <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-variant-numeric: tabular-nums;">${fmtAmt(line.remainingBalanceAfterLine)}</td>
        <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0;">${escHtml((line.postingStatus || "—").replace(/_/g, " "))}</td>
        <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0; font-family: ui-monospace, monospace; font-size: 11px;">${escHtml(jv)}</td>
      </tr>
    `;
  });

  let componentHtml = "";
  components.forEach((row: any, index: number) => {
    componentHtml += `
      <tr>
        <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0; text-align: center;">${index + 1}</td>
        <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0; font-family: ui-monospace, monospace;">${escHtml(row.componentCode || "—")}</td>
        <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0;">${escHtml(row.componentName || "—")}</td>
        <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0; text-align: right;">${fmtAmt(row.amount)}</td>
        <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0;">${fmtDate(row.startDate)} — ${fmtDate(row.endDate)}</td>
      </tr>
    `;
  });

  let adjustmentHtml = "";
  adjustments.forEach((row: any) => {
    adjustmentHtml += `
      <tr>
        <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0;">${escHtml(row.adjustmentNumber || row.id)}</td>
        <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0;">${escHtml((row.adjustmentType || "—").replace(/_/g, " "))}</td>
        <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0;">${fmtDate(row.effectiveDate)}</td>
        <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0;">${escHtml((row.status || "—").replace(/_/g, " "))}</td>
        <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0; text-align: right;">${fmtAmt(row.amount)}</td>
        <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0;">${escHtml(row.reason || "—")}</td>
      </tr>
    `;
  });

  let reconHtml = "";
  reconciliations.forEach((row: any) => {
    reconHtml += `
      <tr>
        <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0;">${fmtDate(row.reconciliationDate)}</td>
        <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0; text-align: right;">${fmtAmt(row.scheduleBalance ?? row.subledgerBalance)}</td>
        <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0; text-align: right;">${fmtAmt(row.glBalance)}</td>
        <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0; text-align: right;">${fmtAmt(row.varianceAmount ?? row.differenceAmount)}</td>
        <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0;">${escHtml((row.status || "—").replace(/_/g, " "))}</td>
      </tr>
    `;
  });

  const jvLinks = lines
    .filter((l: any) => l.journalVoucherId || l.journalVoucherNumber)
    .map((l: any) => {
      return `
        <tr>
          <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0; text-align: center;">${escHtml(l.lineNumber)}</td>
          <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0; font-family: ui-monospace, monospace;">${escHtml(l.journalVoucherNumber || `#${l.journalVoucherId}`)}</td>
          <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0;">${escHtml((l.postingStatus || "—").replace(/_/g, " "))}</td>
          <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0; text-align: right;">${fmtAmt(l.scheduledAmount)}</td>
          <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0;">${fmtDate(l.postedAt || l.recognitionDate || l.periodEndDate)}</td>
        </tr>
      `;
    })
    .join("");

  const leaseNumber = schedule.lease?.leaseNumber || schedule.leaseId || "—";
  const tenantName = schedule.tenant?.name || schedule.tenant?.tenantName || "—";

  return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Lease Revenue - ${escHtml(schedule.scheduleNumber || "Draft")}</title>
        <style>
            @media print {
                @page { size: A4; margin: 12mm; }
                .no-print { display: none !important; }
            }
            body { font-family: 'Inter', Arial, sans-serif; font-size: 12.5px; line-height: 1.45; color: #334155; margin: 0; padding: 22px; }
            .header { display: flex; justify-content: space-between; gap: 16px; border-bottom: 3px solid #1d4ed8; padding-bottom: 14px; margin-bottom: 20px; }
            .title { font-size: 22px; font-weight: 800; color: #1e3a8a; margin: 0; letter-spacing: 0.02em; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 18px; }
            .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 0 0 20px 0; }
            .kpi { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 10px 12px; }
            .kpi .k { font-size: 10px; font-weight: 700; color: #1d4ed8; text-transform: uppercase; letter-spacing: 0.06em; }
            .kpi .v { font-size: 16px; font-weight: 800; color: #1e3a8a; margin-top: 4px; font-variant-numeric: tabular-nums; }
            .section-title { font-weight: 700; margin: 22px 0 8px; color: #1e3a8a; text-transform: uppercase; font-size: 11px; letter-spacing: 1px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
            .label { font-weight: 600; color: #64748b; display: inline-block; min-width: 140px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
            th { text-align: left; background-color: #f8fafc; padding: 8px; border-bottom: 2px solid #e2e8f0; font-weight: 700; color: #475569; font-size: 10px; text-transform: uppercase; }
            .status-badge { display: inline-block; padding: 3px 9px; border-radius: 4px; background: #dbeafe; color: #1e3a8a; font-weight: 700; font-size: 11px; }
            .footer { margin-top: 40px; display: flex; justify-content: space-between; gap: 14px; page-break-inside: avoid; }
            .signature-box { text-align: center; flex: 1; border-top: 1px solid #94a3b8; padding-top: 8px; font-weight: 600; font-size: 11px; }
            .branding { text-align: center; font-size: 10px; color: #94a3b8; margin-top: 28px; }
            .meta-row { margin-bottom: 3px; font-size: 12px; }
            .muted { color: #94a3b8; font-style: italic; padding: 10px 0; }
            .notes { margin-top: 12px; padding: 10px 12px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0; }
        </style>
    </head>
    <body>
        <div class="header">
            <div>
              <h1 class="title">LEASE REVENUE RECOGNITION</h1>
              <p style="margin: 4px 0 6px 0; color: #64748b; font-weight: 700; font-family: ui-monospace, monospace;"># ${escHtml(schedule.scheduleNumber || "DRAFT")}</p>
              <span class="status-badge">${status}</span>
            </div>
            <div style="text-align: right;">
              <div style="font-weight: 800; font-size: 15px; color: #1e3a8a;">${escHtml(companyInfo.name)}</div>
              ${companyInfo.address ? `<div style="color: #64748b;">${escHtml(companyInfo.address)}</div>` : ""}
              ${companyInfo.phone ? `<div style="color: #64748b;">Tel: ${escHtml(companyInfo.phone)}</div>` : ""}
              ${companyInfo.email ? `<div style="color: #64748b;">${escHtml(companyInfo.email)}</div>` : ""}
              ${companyInfo.vatNumber ? `<div style="color: #64748b;">TRN: ${escHtml(companyInfo.vatNumber)}</div>` : ""}
              <div style="color: #94a3b8; font-size: 11px; margin-top: 6px;">Printed: ${escHtml(new Date().toLocaleString("en-AE"))}</div>
            </div>
        </div>

        <div class="kpi-grid">
            <div class="kpi"><div class="k">Contract amount</div><div class="v">${fmtAmt(schedule.totalContractAmount)} ${escHtml(currency)}</div></div>
            <div class="kpi"><div class="k">Recognized</div><div class="v">${fmtAmt(schedule.recognizedAmount)} ${escHtml(currency)}</div></div>
            <div class="kpi"><div class="k">Remaining</div><div class="v">${fmtAmt(schedule.remainingAmount ?? schedule.deferredBalance ?? schedule.totalContractAmount)} ${escHtml(currency)}</div></div>
            <div class="kpi"><div class="k">Daily rate</div><div class="v">${escHtml(Number(schedule.dailyRate ?? 0).toFixed(6))}</div></div>
        </div>

        <div class="info-grid">
            <div>
                <div class="section-title" style="margin-top:0;">Lease</div>
                <div class="meta-row"><span class="label">Lease number:</span> ${escHtml(leaseNumber)}</div>
                <div class="meta-row"><span class="label">Tenant:</span> ${escHtml(tenantName)}</div>
                <div class="meta-row"><span class="label">Revenue model:</span> ${revenueModel}</div>
                <div class="meta-row"><span class="label">Revenue type:</span> ${escHtml((schedule.revenueType || "BASE_RENT").replace(/_/g, " "))}</div>
                <div class="meta-row"><span class="label">Approval status:</span> ${approval}</div>
                <div class="meta-row"><span class="label">Schedule status:</span> ${escHtml((schedule.scheduleStatus || "—").replace(/_/g, " "))}</div>
            </div>
            <div>
                <div class="section-title" style="margin-top:0;">Service &amp; recognition</div>
                <div class="meta-row"><span class="label">Service period:</span> ${start} — ${end}</div>
                <div class="meta-row"><span class="label">Service days:</span> ${escHtml(schedule.totalServiceDays ?? "—")}</div>
                <div class="meta-row"><span class="label">Recognition method:</span> ${method}</div>
                <div class="meta-row"><span class="label">Posting mode:</span> ${postingMode}</div>
                <div class="meta-row"><span class="label">Exchange rate:</span> ${escHtml(schedule.exchangeRate ?? 1)}</div>
            </div>
        </div>

        <div class="section-title">General ledger accounts</div>
        <div class="info-grid">
            <div>
                <div class="meta-row"><span class="label">Revenue (Cr):</span> ${escHtml(revenueGl)}</div>
                <div class="meta-row"><span class="label">Deferred revenue:</span> ${escHtml(deferredGl)}</div>
                <div class="meta-row"><span class="label">Receivable:</span> ${escHtml(receivableGl)}</div>
                <div class="meta-row"><span class="label">Accrued revenue:</span> ${escHtml(accruedGl)}</div>
            </div>
            <div>
                <div class="meta-row"><span class="label">Property ID:</span> ${escHtml(schedule.propertyId ?? "—")}</div>
                <div class="meta-row"><span class="label">Unit ID:</span> ${escHtml(schedule.unitId ?? "—")}</div>
                <div class="meta-row"><span class="label">Lease ID:</span> ${escHtml(schedule.leaseId ?? "—")}</div>
            </div>
        </div>

        ${schedule.notes ? `
        <div class="notes">
            <strong style="color:#1e3a8a;font-size:11px;text-transform:uppercase;">Notes</strong>
            <div style="margin-top:4px;color:#475569;">${escHtml(schedule.notes)}</div>
        </div>
        ` : ""}

        <div class="section-title">Recognition schedule (${lines.length} lines)</div>
        <table>
            <thead>
                <tr>
                    <th style="width:36px;text-align:center;">#</th>
                    <th style="width:72px;">Month</th>
                    <th>Period</th>
                    <th style="width:48px;text-align:center;">Days</th>
                    <th style="text-align:right;width:88px;">Amount</th>
                    <th style="text-align:right;width:88px;">Cumulative</th>
                    <th style="text-align:right;width:88px;">Remaining</th>
                    <th style="width:100px;">Posting</th>
                    <th style="width:110px;">JV</th>
                </tr>
            </thead>
            <tbody>
                ${scheduleHtml || '<tr><td colspan="9" class="muted" style="text-align:center;padding:14px;">No schedule lines</td></tr>'}
            </tbody>
            ${lines.length ? `
            <tfoot>
                <tr>
                    <td colspan="3" style="padding:8px;font-weight:700;border-top:2px solid #1d4ed8;">Totals</td>
                    <td style="padding:8px;text-align:center;font-weight:700;border-top:2px solid #1d4ed8;">${scheduleDays}</td>
                    <td style="padding:8px;text-align:right;font-weight:800;border-top:2px solid #1d4ed8;color:#1e3a8a;">${fmtAmt(scheduleAmount)}</td>
                    <td colspan="4" style="border-top:2px solid #1d4ed8;"></td>
                </tr>
            </tfoot>` : ""}
        </table>

        <div class="section-title">Journal vouchers</div>
        ${jvLinks ? `
        <table>
            <thead>
                <tr>
                    <th style="width:48px;text-align:center;">Line</th>
                    <th>JV number</th>
                    <th style="width:120px;">Status</th>
                    <th style="text-align:right;width:100px;">Amount</th>
                    <th style="width:110px;">Date</th>
                </tr>
            </thead>
            <tbody>${jvLinks}</tbody>
        </table>
        ` : `<div class="muted">No journal vouchers linked yet.</div>`}

        <div class="section-title">Revenue components</div>
        ${componentHtml ? `
        <table>
            <thead>
                <tr>
                    <th style="width:36px;text-align:center;">#</th>
                    <th style="width:110px;">Code</th>
                    <th>Name</th>
                    <th style="text-align:right;width:90px;">Amount</th>
                    <th>Period</th>
                </tr>
            </thead>
            <tbody>${componentHtml}</tbody>
        </table>
        ` : `<div class="muted">No revenue components.</div>`}

        ${adjustmentHtml ? `
        <div class="section-title">Adjustments</div>
        <table>
            <thead>
                <tr>
                    <th style="width:90px;">Number</th>
                    <th style="width:130px;">Type</th>
                    <th style="width:100px;">Effective</th>
                    <th style="width:100px;">Status</th>
                    <th style="text-align:right;width:90px;">Amount</th>
                    <th>Reason</th>
                </tr>
            </thead>
            <tbody>${adjustmentHtml}</tbody>
        </table>
        ` : ""}

        ${reconHtml ? `
        <div class="section-title">Reconciliation</div>
        <table>
            <thead>
                <tr>
                    <th style="width:110px;">Date</th>
                    <th style="text-align:right;">Schedule balance</th>
                    <th style="text-align:right;">GL balance</th>
                    <th style="text-align:right;">Variance</th>
                    <th style="width:140px;">Status</th>
                </tr>
            </thead>
            <tbody>${reconHtml}</tbody>
        </table>
        ` : ""}

        <div class="footer">
            <div class="signature-box">Prepared By</div>
            <div class="signature-box">Reviewed By</div>
            <div class="signature-box">Approved By</div>
            <div class="signature-box">Posted By</div>
        </div>

        <div class="branding">Generated by Emirates Lease Flow — Lease Revenue Recognition Schedule &amp; Posting Detail</div>

        <script>
            window.onload = function() {
                window.print();
                setTimeout(function() { window.close(); }, 500);
            }
        </script>
    </body>
    </html>
  `;
};
