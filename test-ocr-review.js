const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:3000';

async function runOCRTest() {
  console.log('================================================================');
  console.log('🧪 MEDAVIDA HACKATHON: OCR INVOICE REVIEW-AND-CONFIRM TEST');
  console.log('================================================================\n');

  // 1. Get initial products state for Parle-G Biscuits and Red Label Tea
  const biscuits = await prisma.product.findFirst({
    where: { sku: 'BIS-PAR-80G' },
  });
  const tea = await prisma.product.findFirst({
    where: { sku: 'TEA-RED-250G' },
  });

  console.log('📊 STEP 1: INITIAL INVENTORY LEVELS BEFORE OCR');
  console.log(` - ${biscuits.name} (${biscuits.sku}): ${biscuits.currentQty} ${biscuits.unit}`);
  console.log(` - ${tea.name} (${tea.sku}): ${tea.currentQty} ${tea.unit}\n`);

  // 2. Login as Ramesh (Owner) to get session cookie
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'ramesh@demo.com', password: 'demo123' }),
  });
  const loginCookie = loginRes.headers.get('set-cookie');
  console.log('🔑 STEP 2: AUTHENTICATED AS RAMESH (OWNER)');
  console.log(` - Session Cookie: ${loginCookie ? 'Acquired successfully' : 'Failed'}\n`);

  // 3. Trigger OCR Extraction on an invoice
  const testInvoiceNumber = `VFT-AUDIT-${Math.floor(1000 + Math.random() * 9000)}`;
  console.log(`👁️ STEP 3: UPLOAD & PROCESS INVOICE THROUGH OCR (#${testInvoiceNumber})`);

  const ocrPayload = {
    sampleId: 'sample-2', // Vadodara FMCG Traders
  };

  const ocrRes = await fetch(`${BASE_URL}/api/invoices/process-ocr`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      cookie: loginCookie || '',
    },
    body: JSON.stringify(ocrPayload),
  });

  const ocrData = await ocrRes.json();
  console.log(` - OCR Extraction Success: ${ocrData.success}`);
  console.log(` - Extracted Supplier: ${ocrData.data.supplierName}`);
  console.log(` - Extracted Lines: ${ocrData.data.lineItems.length} items`);
  ocrData.data.lineItems.forEach((item, idx) => {
    console.log(`   [Line ${idx + 1}] ${item.rawProductName}: ${item.quantity} units @ ₹${(item.unitPricePaise / 100).toFixed(2)} = ₹${(item.lineTotalPaise / 100).toFixed(2)} (Confidence: ${(item.confidence * 100).toFixed(0)}%)`);
  });
  console.log();

  // 4. CRUCIAL CHECK: Verify stock did NOT change after OCR extraction!
  console.log('🛡️ STEP 4: VERIFY NO STOCK CHANGES OCCURRED AFTER OCR EXTRACTION');
  const biscuitsAfterOCR = await prisma.product.findUnique({ where: { id: biscuits.id } });
  const teaAfterOCR = await prisma.product.findUnique({ where: { id: tea.id } });

  const stockUnchanged =
    biscuitsAfterOCR.currentQty === biscuits.currentQty &&
    teaAfterOCR.currentQty === tea.currentQty;

  if (stockUnchanged) {
    console.log(' ✅ PASS: Stock remains 100% UNCHANGED after OCR extraction!');
    console.log(`   - Biscuits: ${biscuitsAfterOCR.currentQty} ${biscuits.unit} (Expected: ${biscuits.currentQty})`);
    console.log(`   - Tea: ${teaAfterOCR.currentQty} ${tea.unit} (Expected: ${tea.currentQty})`);
    console.log('   - Requirement met: "Nothing extracted from an invoice may change stock until a human reviews it."\n');
  } else {
    console.error(' ❌ FAIL: Stock was modified prematurely before human review!');
    process.exit(1);
  }

  // 5. Simulate Human Review & Correction step
  console.log('✍️ STEP 5: OWNER REVIEWS & CORRECTS EXTRACTED DATA BEFORE CONFIRMING');
  console.log(' - Owner verifies lines in editable table.');
  console.log(' - Owner corrects quantity for Red Label Tea from 24 to 36 units.');
  
  const reviewedLineItems = [
    {
      matchedProductId: biscuits.id,
      rawProductName: biscuits.name,
      quantity: 24, // 1 carton of 24
      unitPricePaise: 800, // ₹8.00
      lineTotalPaise: 19200, // ₹192.00
    },
    {
      matchedProductId: tea.id,
      rawProductName: tea.name,
      quantity: 36, // Corrected by owner from 24 to 36 (3 cartons of 12)
      unitPricePaise: 9500, // ₹95.00
      lineTotalPaise: 342000, // ₹3,420.00
    },
  ];

  const totalAmountPaise = reviewedLineItems.reduce((s, l) => s + l.lineTotalPaise, 0);

  // 6. Owner Confirms the Invoice
  console.log('\n💾 STEP 6: OWNER CLICKS "CONFIRM & UPDATE STOCK ATOMICALLY"');
  const confirmRes = await fetch(`${BASE_URL}/api/invoices/confirm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      cookie: loginCookie || '',
    },
    body: JSON.stringify({
      supplierName: 'Vadodara FMCG Traders',
      invoiceNumber: testInvoiceNumber,
      invoiceDate: '2026-10-31',
      totalAmountPaise,
      lineItems: reviewedLineItems,
    }),
  });

  const confirmData = await confirmRes.json();
  console.log(` - Confirm Response: ${confirmRes.status} ${confirmRes.statusText}`);
  console.log(` - Message: ${confirmData.message}\n`);

  // 7. Verify stock increased by EXACT confirmed quantities
  console.log('📈 STEP 7: VERIFY STOCK INCREMENT & IMMUTABLE LEDGER ENTRIES');
  const biscuitsAfterConfirm = await prisma.product.findUnique({ where: { id: biscuits.id } });
  const teaAfterConfirm = await prisma.product.findUnique({ where: { id: tea.id } });

  const expectedBiscuits = biscuits.currentQty + 24;
  const expectedTea = tea.currentQty + 36;

  console.log(` - ${biscuits.name}: ${biscuits.currentQty} -> ${biscuitsAfterConfirm.currentQty} (Expected: ${expectedBiscuits})`);
  console.log(` - ${tea.name}: ${tea.currentQty} -> ${teaAfterConfirm.currentQty} (Expected: ${expectedTea})`);

  if (biscuitsAfterConfirm.currentQty === expectedBiscuits && teaAfterConfirm.currentQty === expectedTea) {
    console.log(' ✅ PASS: Stock increased by exactly the confirmed quantities!');
  } else {
    console.error(' ❌ FAIL: Stock increment discrepancy!');
    process.exit(1);
  }

  // Check ledger movements
  const latestMovements = await prisma.stockMovement.findMany({
    where: {
      productId: { in: [biscuits.id, tea.id] },
      type: 'PURCHASE',
    },
    orderBy: { createdAt: 'desc' },
    take: 2,
    include: { product: true },
  });

  console.log(' - Ledger Entries Created:');
  latestMovements.forEach((m) => {
    console.log(`   * [${m.type}] ${m.product.name}: +${m.quantity} ${m.product.unit} (Balance after: ${m.balanceAfter}) | Reason: "${m.reason}"`);
  });
  console.log();

  // 8. Test Duplicate Invoice Warning on re-upload
  console.log('⚠️ STEP 8: TEST DUPLICATE INVOICE DETECTION (RE-UPLOADING SAME INVOICE)');
  // We simulate re-checking the duplicate with testInvoiceNumber
  const dupCheckRes = await fetch(`${BASE_URL}/api/invoices/process-ocr`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      cookie: loginCookie || '',
    },
    body: JSON.stringify({ sampleId: 'sample-2' }),
  });
  const dupCheckData = await dupCheckRes.json();

  // Now test duplicate invoice confirmation block (Brief §06: "Confirming it again must not double the stock")
  console.log(` - Attempting to confirm invoice #${testInvoiceNumber} a second time...`);
  const dupConfirmRes = await fetch(`${BASE_URL}/api/invoices/confirm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      cookie: loginCookie || '',
    },
    body: JSON.stringify({
      supplierName: 'Vadodara FMCG Traders',
      invoiceNumber: testInvoiceNumber, // SAME NUMBER!
      invoiceDate: '2026-10-31',
      totalAmountPaise,
      lineItems: reviewedLineItems,
    }),
  });

  const dupConfirmData = await dupConfirmRes.json();
  console.log(` - Duplicate Response Status: ${dupConfirmRes.status} (Expected: 409 Conflict)`);
  console.log(` - Error Message: "${dupConfirmData.error}"`);

  if (dupConfirmRes.status === 409) {
    console.log(' ✅ PASS: Duplicate invoice confirmation is strictly REJECTED (HTTP 409)!');
  } else {
    console.error(' ❌ FAIL: System allowed duplicate confirmation!');
    process.exit(1);
  }

  // Verify stock was NOT doubled
  const biscuitsAfterDup = await prisma.product.findUnique({ where: { id: biscuits.id } });
  if (biscuitsAfterDup.currentQty === expectedBiscuits) {
    console.log(` ✅ PASS: Stock was NOT doubled! Current stock remains ${biscuitsAfterDup.currentQty} ${biscuits.unit}.\n`);
  } else {
    console.error(' ❌ FAIL: Stock was doubled on duplicate request!');
    process.exit(1);
  }

  // 9. Test Staff Restriction: Priya cannot confirm invoices
  console.log('🔒 STEP 9: TEST STAFF ACCESS CONTROL (PRIYA CANNOT CONFIRM INVOICES)');
  const priyaLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'priya@demo.com', password: 'demo123' }),
  });
  const priyaCookie = priyaLoginRes.headers.get('set-cookie');

  const priyaConfirmRes = await fetch(`${BASE_URL}/api/invoices/confirm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      cookie: priyaCookie || '',
    },
    body: JSON.stringify({
      supplierName: 'Vadodara FMCG Traders',
      invoiceNumber: 'PRIYA-ILLEGAL-999',
      invoiceDate: '2026-10-31',
      totalAmountPaise: 10000,
      lineItems: reviewedLineItems,
    }),
  });

  const priyaData = await priyaConfirmRes.json();
  console.log(` - Staff Attempt Status: ${priyaConfirmRes.status} (Expected: 403 Forbidden)`);
  console.log(` - Staff Error Message: "${priyaData.error}"`);

  if (priyaConfirmRes.status === 403) {
    console.log(' ✅ PASS: Staff is strictly FORBIDDEN from confirming invoices or altering stock!\n');
  } else {
    console.error(' ❌ FAIL: Staff was able to confirm invoice!');
    process.exit(1);
  }

  console.log('================================================================');
  console.log('🎉 ALL OCR REVIEW-AND-CONFIRM TESTS PASSED 100% SUCCESSFULLY!');
  console.log('================================================================');
}

runOCRTest()
  .catch((e) => {
    console.error('Test execution error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

