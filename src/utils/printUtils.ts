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

export const generateReceiptHtml = (rec: any) => {
  const companyInfo = rec.companyInfo || {
    name: "Emirates Lease Flow",
    address: "Dubai, UAE",
    phone: "+971 4 000 0000",
    email: "info@emirateslease.ae",
    vatNumber: "100123456789123"
  };

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

export const generateVoucherHtml = (rec: any) => {
  const companyInfo = rec.companyInfo || {
    name: "Emirates Lease Flow",
    address: "Dubai, UAE",
    phone: "+971 4 000 0000"
  };

  const status = rec.isPosted ? "POSTED" : "DRAFT";
  const statusColor = rec.isPosted ? "#059669" : "#d97706";
  
  let details = rec.details || [];
  if (typeof details === 'string') {
    try { details = JSON.parse(details); } catch(e) {}
  }

  let rowsHtml = '';
  let totalDr = 0;
  let totalCr = 0;

  details.forEach((line: any) => {
    const isDr = line.drCr === 'Dr';
    const amount = parseFloat(line.amount || 0);
    if (isDr) totalDr += amount;
    else totalCr += amount;

    rowsHtml += `
      <tr>
        <td style="padding: 10px; border: 1px solid #e2e8f0;">${line.particular || '—'}</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0;">${line.ledger || '—'}</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: right;">${isDr ? amount.toFixed(2) : ''}</td>
        <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: right;">${!isDr ? amount.toFixed(2) : ''}</td>
      </tr>
    `;
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Payment Voucher - ${rec.paymentNumber}</title>
      <style>
        @media print {
          @page { size: A4; margin: 0.5in; }
          body { margin: 0; }
        }
        body { font-family: 'Inter', Arial, sans-serif; font-size: 13px; line-height: 1.4; color: #1e293b; }
        .voucher-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 2px solid #334155; padding-bottom: 15px; }
        .voucher-title { font-size: 22px; font-weight: 800; color: #0f172a; margin: 0; }
        .status-badge { display: inline-block; padding: 4px 12px; border-radius: 4px; border: 2px solid ${statusColor}; color: ${statusColor}; font-weight: 800; font-size: 16px; margin-top: 5px; }
        .info-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .info-table td { padding: 5px 0; vertical-align: top; }
        .label { font-weight: 700; color: #475569; width: 120px; }
        .main-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        .main-table th { background-color: #f1f5f9; padding: 10px; border: 1px solid #cbd5e1; text-align: left; }
        .footer { margin-top: 60px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        .signature-box { border-top: 1px solid #334155; padding-top: 8px; text-align: center; font-weight: 600; font-size: 11px; }
      </style>
    </head>
    <body>
      <div class="voucher-header">
        <div>
          <div style="font-weight: 800; font-size: 16px; color: #334155;">${companyInfo.name}</div>
          <div style="color: #64748b; font-size: 11px;">${companyInfo.address} | ${companyInfo.phone}</div>
        </div>
        <div style="text-align: right;">
          <h1 class="voucher-title">PAYMENT VOUCHER</h1>
          <div class="status-badge">${status}</div>
        </div>
      </div>

      <table class="info-table">
        <tr>
          <td class="label">Voucher No:</td>
          <td>${rec.paymentNumber}</td>
          <td class="label">Date:</td>
          <td>${new Date(rec.paymentDate).toLocaleDateString()}</td>
        </tr>
        <tr>
          <td class="label">Paid To:</td>
          <td colspan="3">${rec.tenantName || rec.payeeName || '—'}</td>
        </tr>
        <tr>
          <td class="label">Narrations:</td>
          <td colspan="3">${rec.remarks || rec.description || '—'}</td>
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

      <div class="footer">
        <div class="signature-box">Prepared By</div>
        <div class="signature-box">Verified By</div>
        <div class="signature-box">Approved By</div>
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
    const itemName = item.itemName || item.item?.itemName || 'Unknown Item';

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

  return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Purchase Invoice - ${pi.invoiceNumber}</title>
        <style>
            @media print {
                @page { size: A4; margin: 0; }
                body { margin-top: 2.5in; margin-left: 0.5in; margin-right: 0.5in; margin-bottom: 0.5in; }
            }
            body { font-family: 'Inter', Arial, sans-serif; font-size: 14px; line-height: 1.5; color: #333; }
            .header { display: flex; justify-content: space-between; border-bottom: 3px solid #3b82f6; padding-bottom: 20px; margin-bottom: 40px; }
            .title { font-size: 28px; font-weight: 800; color: #1e40af; margin: 0; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 30px; }
            .label { font-weight: 600; width: 140px; display: inline-block; color: #64748b; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { text-align: left; background-color: #f8fafc; padding: 12px; border-bottom: 2px solid #e2e8f0; font-weight: 700; color: #475569; }
            td { padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
            .totals-section { display: flex; justify-content: flex-end; }
            .totals-table { width: 300px; }
            .totals-table td { padding: 5px 10px; }
            .totals-table .total-row { font-weight: 800; border-top: 2px solid #3b82f6; font-size: 16px; color: #1e40af; }
            .footer { margin-top: 60px; display: flex; justify-content: space-between; }
            .signature-box { text-align: center; width: 220px; border-top: 1px solid #94a3b8; padding-top: 10px; font-weight: 600; }
            .branding { text-align: center; font-size: 10px; color: #94a3b8; margin-top: 60px; }
        </style>
    </head>
    <body>
        <div class="header">
            <div>
              <h1 class="title">PURCHASE INVOICE</h1>
              <p style="margin: 5px 0 0 0; color: #64748b; font-weight: 600;"># ${pi.invoiceNumber}</p>
            </div>
            <div style="text-align: right;">
              <div style="font-weight: 800; font-size: 18px; color: #1e40af;">${companyInfo.name}</div>
              <div style="color: #64748b;">${companyInfo.address}</div>
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
        <div style="margin-top: 30px; padding: 15px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
            <strong style="color: #1e40af; font-size: 12px; text-transform: uppercase;">Notes:</strong>
            <div style="margin-top: 5px; color: #475569; font-size: 13px;">${pi.notes}</div>
        </div>
        ` : ''}

        <div class="footer">
            <div class="signature-box">Prepared By</div>
            <div class="signature-box">Approved By</div>
        </div>
        
        <div class="branding">Generated by Emirates Lease Flow</div>

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
