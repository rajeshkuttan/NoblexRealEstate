const assert = require('assert');

function calculateTotals(lineItems, discountType = 'amount', discountValue = 0) {
  // 1. Calculate Raw Subtotal (Sum of Gross Amounts)
  let rawSubtotal = 0;
  lineItems.forEach(item => {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.unit_price) || 0;
    rawSubtotal += qty * price;
  });

  // 2. Calculate Global Discount Amount
  let globalDiscountAmount = 0;
  const numericDiscountValue = parseFloat(discountValue) || 0;
  
  if (discountType === 'percentage') {
    globalDiscountAmount = (rawSubtotal * numericDiscountValue) / 100;
  } else {
    globalDiscountAmount = numericDiscountValue;
  }
  
  // Ensure discount doesn't exceed subtotal
  globalDiscountAmount = Math.min(globalDiscountAmount, rawSubtotal);

  let subtotal = 0; // This will accumulate the Taxable Amount (Net of Discount)
  let taxAmount = 0;
  
  // 3. Prorate Discount to Items & Calculate Tax
  const resultItems = lineItems.map(item => {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.unit_price) || 0;
    const itemGross = qty * price;
    
    // Calculate weight for proration
    const weight = rawSubtotal > 0 ? (itemGross / rawSubtotal) : 0;
    const itemDiscount = globalDiscountAmount * weight;
    const itemTaxable = itemGross - itemDiscount;
    
    subtotal += itemTaxable;
    
    // Calculate tax based on UAE FTA classification
    const classification = item.tax_classification || 'Standard-Rated';
    let itemTax = 0;
    let itemTaxPercent = 0;
    
    if (classification === 'Standard-Rated' || classification === 'Standard-Rated (5%)') {
      itemTaxPercent = parseFloat(item.tax_percent) || 5; // Default 5% for UAE
      itemTax = (itemTaxable * itemTaxPercent) / 100;
      item.taxable = true;
    } else {
        itemTax = 0;
    }
    
    taxAmount += itemTax;
    
    return {
        ...item,
        itemGross,
        itemDiscount,
        itemTaxable,
        itemTax
    };
  });
  
  const totalAmount = subtotal + taxAmount;
  return { subtotal, taxAmount, totalAmount, resultItems };
}

// Test Case 1: Mixed Tax Rates
// Item A: 1000, 5% Tax
// Item B: 1000, 0% Tax
// Discount: 200 (Amount)
// Expected: A gets 100 disc, B gets 100 disc.
// A Taxable = 900 -> Tax 45.
// B Taxable = 900 -> Tax 0.
// Total Tax = 45.
// Total Amount = 1800 (Net Base) + 45 = 1845.

const testItems = [
    { quantity: 10, unit_price: 100, tax_classification: 'Standard-Rated', tax_percent: 5 },
    { quantity: 10, unit_price: 100, tax_classification: 'Exempt', tax_percent: 0 }
];

const result = calculateTotals(testItems, 'amount', 200);

console.log('Result:', JSON.stringify(result, null, 2));

assert.strictEqual(result.taxAmount, 45, 'Tax Amount should be 45');
// Floating point tolerance check might be needed in real system, but exact match for whole numbers here
assert.ok(Math.abs(result.totalAmount - 1845) < 0.01, 'Total Amount should be 1845');

console.log('Verification Passed!');
