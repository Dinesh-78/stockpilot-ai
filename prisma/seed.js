const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database with MedaVida Hackathon requirements...');

  // Clean old data
  await prisma.auditLog.deleteMany();
  await prisma.invoiceLine.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.product.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.user.deleteMany();
  await prisma.business.deleteMany();

  const defaultPasswordHash = await bcrypt.hash('demo123', 10);

  // 1. Business: Ramesh General Store
  const rameshBusiness = await prisma.business.create({
    data: {
      name: 'Ramesh General Store',
    },
  });

  // 2. Business: Anita Medical (Multi-tenant test)
  const anitaBusiness = await prisma.business.create({
    data: {
      name: 'Anita Medical',
    },
  });

  // Users for Ramesh General Store
  const rameshUser = await prisma.user.create({
    data: {
      businessId: rameshBusiness.id,
      name: 'Ramesh Patel',
      email: 'ramesh@demo.com',
      passwordHash: defaultPasswordHash,
      role: 'OWNER',
    },
  });

  const priyaUser = await prisma.user.create({
    data: {
      businessId: rameshBusiness.id,
      name: 'Priya Sharma',
      email: 'priya@demo.com',
      passwordHash: defaultPasswordHash,
      role: 'STAFF',
    },
  });

  // User for Anita Medical
  const anitaUser = await prisma.user.create({
    data: {
      businessId: anitaBusiness.id,
      name: 'Dr. Anita Desai',
      email: 'anita@demo.com',
      passwordHash: defaultPasswordHash,
      role: 'OWNER',
    },
  });

  console.log('Users created:');
  console.log(' - Ramesh (Owner): ramesh@demo.com / demo123 (Ramesh General Store)');
  console.log(' - Priya (Staff): priya@demo.com / demo123 (Ramesh General Store)');
  console.log(' - Anita (Owner): anita@demo.com / demo123 (Anita Medical)');

  // Suppliers for Ramesh General Store
  const supGujarat = await prisma.supplier.create({
    data: {
      businessId: rameshBusiness.id,
      name: 'Gujarat Wholesale Distributors',
      contact: '+91 98250 12345',
      defaultLeadTimeDays: 4,
    },
  });

  const supVadodara = await prisma.supplier.create({
    data: {
      businessId: rameshBusiness.id,
      name: 'Vadodara FMCG Traders',
      contact: '+91 98980 54321',
      defaultLeadTimeDays: 3,
    },
  });

  const supAmul = await prisma.supplier.create({
    data: {
      businessId: rameshBusiness.id,
      name: 'Amul Dairy Supplies',
      contact: '+91 94260 99887',
      defaultLeadTimeDays: 2,
    },
  });

  const supPatanjali = await prisma.supplier.create({
    data: {
      businessId: rameshBusiness.id,
      name: 'Patanjali Foods Direct',
      contact: '+91 97240 11223',
      defaultLeadTimeDays: 5,
    },
  });

  // Products from the brief for Ramesh General Store
  // Note: Prices stored in paise (1 INR = 100 paise)
  const productsData = [
    {
      sku: 'OIL-SUN-1L',
      name: 'Cooking Oil (Sunflower 1L)',
      category: 'Oils & Ghee',
      unit: 'pcs',
      costPricePaise: 11500, // ₹115.00
      sellingPricePaise: 14000, // ₹140.00
      currentQty: 9, // Exactly 9 left as in brief!
      reorderLevel: 20,
      leadTimeDays: 4,
      packSize: 24, // 24 bottles per carton
      supplierId: supGujarat.id,
      targetDailySales: 6.0, // Sells 6/day as in brief
    },
    {
      sku: 'BIS-PAR-80G',
      name: 'Parle-G Biscuits 80g',
      category: 'Snacks & Biscuits',
      unit: 'pcs',
      costPricePaise: 800, // ₹8.00
      sellingPricePaise: 1000, // ₹10.00
      currentQty: 18,
      reorderLevel: 50,
      leadTimeDays: 3,
      packSize: 24, // Carton of 24
      supplierId: supVadodara.id,
      targetDailySales: 12.0,
    },
    {
      sku: 'RIC-BAS-KG',
      name: 'Basmati Rice Premium',
      category: 'Grains & Pulses',
      unit: 'kg',
      costPricePaise: 8500, // ₹85.00/kg
      sellingPricePaise: 11000, // ₹110.00/kg
      currentQty: 14.5,
      reorderLevel: 30,
      leadTimeDays: 4,
      packSize: 25, // 25kg bag
      supplierId: supGujarat.id,
      targetDailySales: 5.5,
    },
    {
      sku: 'TEA-RED-250G',
      name: 'Red Label Tea 250g',
      category: 'Beverages',
      unit: 'pcs',
      costPricePaise: 9500, // ₹95.00
      sellingPricePaise: 12000, // ₹120.00
      currentQty: 8,
      reorderLevel: 15,
      leadTimeDays: 3,
      packSize: 12, // Carton of 12
      supplierId: supVadodara.id,
      targetDailySales: 3.5,
    },
    {
      sku: 'GHE-AMU-1L',
      name: 'Amul Pure Ghee 1L',
      category: 'Oils & Ghee',
      unit: 'litre',
      costPricePaise: 54000, // ₹540.00
      sellingPricePaise: 62000, // ₹620.00
      currentQty: 4,
      reorderLevel: 8,
      leadTimeDays: 2,
      packSize: 6, // Case of 6
      supplierId: supAmul.id,
      targetDailySales: 2.0,
    },
    {
      sku: 'DAL-TOOR-KG',
      name: 'Toor Dal Premium',
      category: 'Grains & Pulses',
      unit: 'kg',
      costPricePaise: 13000, // ₹130.00/kg
      sellingPricePaise: 16000, // ₹160.00/kg
      currentQty: 22.0,
      reorderLevel: 25,
      leadTimeDays: 4,
      packSize: 30, // 30kg sack
      supplierId: supGujarat.id,
      targetDailySales: 4.0,
    },
    {
      sku: 'SUG-MAD-KG',
      name: 'Madhur Pure Sugar',
      category: 'Staples',
      unit: 'kg',
      costPricePaise: 4000, // ₹40.00/kg
      sellingPricePaise: 4800, // ₹48.00/kg
      currentQty: 65.0,
      reorderLevel: 40,
      leadTimeDays: 3,
      packSize: 50, // 50kg bag
      supplierId: supGujarat.id,
      targetDailySales: 8.0,
    },
    {
      sku: 'ATT-AAS-5KG',
      name: 'Aashirvaad Shudh Chakki Atta 5kg',
      category: 'Staples',
      unit: 'pcs',
      costPricePaise: 21000, // ₹210.00
      sellingPricePaise: 25000, // ₹250.00
      currentQty: 11,
      reorderLevel: 15,
      leadTimeDays: 4,
      packSize: 10,
      supplierId: supPatanjali.id,
      targetDailySales: 3.0,
    },
    {
      sku: 'SOP-DET-75G',
      name: 'Dettol Original Soap 75g',
      category: 'Personal Care',
      unit: 'pcs',
      costPricePaise: 2800, // ₹28.00
      sellingPricePaise: 3500, // ₹35.00
      currentQty: 45,
      reorderLevel: 30,
      leadTimeDays: 3,
      packSize: 24,
      supplierId: supVadodara.id,
      targetDailySales: 5.0,
    },
    {
      sku: 'NOD-MAG-70G',
      name: 'Maggi 2-Minute Noodles 70g',
      category: 'Snacks & Biscuits',
      unit: 'pcs',
      costPricePaise: 1100, // ₹11.00
      sellingPricePaise: 1400, // ₹14.00
      currentQty: 52,
      reorderLevel: 40,
      leadTimeDays: 3,
      packSize: 48,
      supplierId: supVadodara.id,
      targetDailySales: 10.0,
    },
    {
      sku: 'JAM-KIS-500G',
      name: 'Kissan Mixed Fruit Jam 500g',
      category: 'Breakfast',
      unit: 'pcs',
      costPricePaise: 13500, // ₹135.00
      sellingPricePaise: 16500, // ₹165.00
      currentQty: 12,
      reorderLevel: 10,
      leadTimeDays: 5,
      packSize: 12,
      supplierId: supVadodara.id,
      targetDailySales: 1.2,
    },
    {
      sku: 'SLT-TAT-1KG',
      name: 'Tata Salt Vacuum Evaporated 1kg',
      category: 'Staples',
      unit: 'pcs',
      costPricePaise: 2000, // ₹20.00
      sellingPricePaise: 2500, // ₹25.00
      currentQty: 30,
      reorderLevel: 25,
      leadTimeDays: 3,
      packSize: 24,
      supplierId: supGujarat.id,
      targetDailySales: 4.5,
    },
  ];

  const createdProducts = [];
  for (const p of productsData) {
    const { targetDailySales, ...prodFields } = p;
    const created = await prisma.product.create({
      data: {
        businessId: rameshBusiness.id,
        ...prodFields,
      },
    });
    createdProducts.push({ ...created, targetDailySales });
  }

  // Create products for Anita Medical (to test multi-tenancy)
  const anitaProducts = [
    {
      sku: 'MED-PCM-650',
      name: 'Dolo 650mg Paracetamol Tablets',
      category: 'Analgesics',
      unit: 'box',
      costPricePaise: 2200,
      sellingPricePaise: 3100,
      currentQty: 40,
      reorderLevel: 20,
      leadTimeDays: 2,
      packSize: 10,
    },
    {
      sku: 'MED-AMX-500',
      name: 'Amoxicillin 500mg Capsules',
      category: 'Antibiotics',
      unit: 'box',
      costPricePaise: 7500,
      sellingPricePaise: 10500,
      currentQty: 15,
      reorderLevel: 10,
      leadTimeDays: 3,
      packSize: 5,
    },
  ];

  for (const ap of anitaProducts) {
    await prisma.product.create({
      data: {
        businessId: anitaBusiness.id,
        ...ap,
      },
    });
  }

  console.log(`Created ${createdProducts.length} products for Ramesh General Store and ${anitaProducts.length} for Anita Medical`);

  // Initial stock movements (PURCHASE) for Ramesh products
  for (const prod of createdProducts) {
    await prisma.stockMovement.create({
      data: {
        businessId: rameshBusiness.id,
        productId: prod.id,
        userId: rameshUser.id,
        type: 'PURCHASE',
        quantity: prod.currentQty + 200, // starting stock was higher before 30 days of sales
        balanceAfter: prod.currentQty + 200,
        reason: 'Initial store inventory batch',
        createdAt: new Date(Date.now() - 31 * 86400000),
      },
    });
  }

  // Generate 30 days of historical sales for Ramesh products
  console.log('Generating 30 days of sales history to power forecasting and velocity...');
  const now = Date.now();

  for (let day = 30; day >= 1; day--) {
    const saleDate = new Date(now - day * 86400000 + (Math.random() * 28800000 + 36000000)); // between 10am and 6pm
    
    // Create 2-4 sales tickets per day
    const salesCount = Math.floor(Math.random() * 3) + 2;
    for (let s = 0; s < salesCount; s++) {
      // Pick 2-4 products per sale
      const sampleProds = [...createdProducts].sort(() => 0.5 - Math.random()).slice(0, Math.floor(Math.random() * 3) + 2);
      
      let totalAmountPaise = 0;
      const saleItemsToCreate = [];
      const movementsToCreate = [];

      for (const p of sampleProds) {
        // Daily qty proportion
        const dailyTarget = p.targetDailySales;
        const portion = (dailyTarget / salesCount) * (0.8 + Math.random() * 0.4);
        let qty = Math.max(1, p.unit === 'kg' ? Math.round(portion * 10) / 10 : Math.round(portion));
        if (p.sku === 'OIL-SUN-1L') {
          // ensure Cooking Oil sells ~6/day
          qty = s === 0 ? 3 : 3;
        }

        const lineTotal = Math.round(qty * p.sellingPricePaise);
        totalAmountPaise += lineTotal;

        saleItemsToCreate.push({
          productId: p.id,
          quantity: qty,
          unitPricePaise: p.sellingPricePaise,
          lineTotalPaise: lineTotal,
        });

        movementsToCreate.push({
          businessId: rameshBusiness.id,
          productId: p.id,
          userId: s % 2 === 0 ? rameshUser.id : priyaUser.id,
          type: 'SALE',
          quantity: -qty,
          balanceAfter: 0, // placeholder
          reason: `Sale on ${saleDate.toLocaleDateString()}`,
          createdAt: saleDate,
        });
      }

      const sale = await prisma.sale.create({
        data: {
          businessId: rameshBusiness.id,
          userId: s % 2 === 0 ? rameshUser.id : priyaUser.id,
          idempotencyKey: `SEED-SALE-D${day}-S${s}-${Math.random().toString(36).substring(7)}`,
          totalAmountPaise,
          createdAt: saleDate,
          items: {
            create: saleItemsToCreate,
          },
        },
      });

      for (const m of movementsToCreate) {
        m.saleId = sale.id;
        await prisma.stockMovement.create({ data: m });
      }
    }
  }

  // Create an initial audit log
  await prisma.auditLog.create({
    data: {
      businessId: rameshBusiness.id,
      userId: rameshUser.id,
      entityType: 'system',
      entityId: rameshBusiness.id,
      action: 'INITIALIZE',
      details: JSON.stringify({ message: 'Store initialized with seed catalog and suppliers' }),
    },
  });

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

