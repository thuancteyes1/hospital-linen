import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import * as dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db, isDbConfigured } from './src/db/index.ts';
import { users, linenItems, deptAllocations, deliverySlips, laundryDispatches, history } from './src/db/schema.ts';
import { eq, or } from 'drizzle-orm';

import authRouter, { getUsersData, syncUsersData } from './routes/auth.ts';
import inventoryRouter, { getInventoryData, syncInventoryData } from './routes/inventory.ts';
import deliveryRouter, { getDeliveryData, syncDeliveryData } from './routes/delivery.ts';
import reportsRouter, { getReportsData, syncReportsData } from './routes/reports.ts';
import { updateInMemoryStore } from './routes/serverStore.ts';

// Initialize dotenv
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'hosplinen-secure-super-secret-key-2026';




const app = express();
app.use(express.json({ limit: '50mb' }));

const PORT = 3000;

// --- DATABASE SEEDING ON STARTUP ---
async function seedDatabaseIfEmpty() {
  if (!isDbConfigured()) {
    console.log('SQL Database is not configured. Skipping seeding.');
    return;
  }
  try {
    const existingItems = await db.select().from(linenItems).limit(1);
    if (existingItems.length > 0) {
      console.log('Database already has data. Skipping seed.');
      return;
    }

    console.log('Database is empty. Seeding initial linen management data...');

    // Import initial data from data file dynamically
    const {
      INITIAL_LINEN_ITEMS,
      INITIAL_DETAIL_ALLOCATIONS,
      INITIAL_USERS,
      INITIAL_ACCOUNTS,
      INITIAL_WARD_DELIVERY_SLIPS,
      INITIAL_LAUNDRY_DISPATCHES
    } = await import('./src/data.ts');

    await db.transaction(async (tx) => {
      // 1. Seed Linen Items
      const formattedItems = INITIAL_LINEN_ITEMS.map((item) => ({
        ma: item.ma,
        ten: item.ten,
        nhom: item.nhom,
        kc: item.kc,
        mn: item.mn,
        hinhAnh: item.hinhAnh || null,
        trang: item.trang || 'Trang 1'
      }));
      await tx.insert(linenItems).values(formattedItems);

      // 2. Seed Department Allocations
      const formattedAllocations: any[] = [];
      Object.entries(INITIAL_DETAIL_ALLOCATIONS).forEach(([itemMa, allocs]) => {
        allocs.forEach(([dept, qty]) => {
          formattedAllocations.push({
            itemMa,
            dept,
            qty
          });
        });
      });
      if (formattedAllocations.length > 0) {
        await tx.insert(deptAllocations).values(formattedAllocations);
      }

      // 3. Seed Users and custom accounts
      const userListToInsert: any[] = [];
      INITIAL_ACCOUNTS.forEach((acc) => {
        const correspondingUser = INITIAL_USERS[acc.userIdx] || null;
        userListToInsert.push({
          uid: `mock:${acc.username}`,
          email: acc.email,
          name: acc.name,
          role: correspondingUser ? correspondingUser.role : (acc.isAdmin ? 0 : 2),
          dept: correspondingUser ? correspondingUser.dept : 'Kho trung tâm',
          status: acc.status,
          isAdmin: acc.isAdmin,
          passwordHash: acc.password ? bcrypt.hashSync(acc.password, 10) : bcrypt.hashSync('123456', 10)
        });
      });
      if (userListToInsert.length > 0) {
        await tx.insert(users).values(userListToInsert);
      }

      // 4. Seed Slips
      const formattedSlips = INITIAL_WARD_DELIVERY_SLIPS.map((slip) => ({
        id: slip.id,
        dept: slip.dept,
        createdAt: slip.createdAt,
        createdBy: slip.createdBy,
        originalSlipId: slip.originalSlipId || null,
        originalCreatedAt: slip.originalCreatedAt || null,
        receiver: slip.receiver || null,
        status: slip.status,
        confirmedAt: slip.confirmedAt || null,
        confirmedBy: slip.confirmedBy || null,
        laundryDispatchId: slip.laundryDispatchId || null,
        laundryReceivedBy: slip.laundryReceivedBy || null,
        laundryReceivedAt: slip.laundryReceivedAt || null,
        laundryReturnedBy: slip.laundryReturnedBy || null,
        laundryReturnedAt: slip.laundryReturnedAt || null,
        hospitalCleanBy: slip.hospitalCleanBy || null,
        hospitalCleanAt: slip.hospitalCleanAt || null,
        verifiedDirtyBy: slip.verifiedDirtyBy || null,
        verifiedDirtyAt: slip.verifiedDirtyAt || null,
        isGuestSlip: slip.isGuestSlip || false,
        isRewash: slip.isRewash || false,
        attachedImage: slip.attachedImage || null,
        guestName: slip.guestName || null,
        guestRoom: slip.guestRoom || null,
        items: JSON.stringify(slip.items)
      }));
      if (formattedSlips.length > 0) {
        await tx.insert(deliverySlips).values(formattedSlips);
      }

      // 5. Seed Laundry Dispatches
      const formattedDispatches = INITIAL_LAUNDRY_DISPATCHES.map((ld) => ({
        id: ld.id,
        createdAt: ld.createdAt,
        originalDispatchId: ld.originalDispatchId || null,
        originalCreatedAt: ld.originalCreatedAt || null,
        contractor: ld.contractor,
        driver: ld.driver,
        plate: ld.plate,
        status: ld.status,
        laundryReceivedAt: ld.laundryReceivedAt || null,
        laundryReceivedBy: ld.laundryReceivedBy || null,
        cleanReturnedAt: ld.cleanReturnedAt || null,
        cleanReturnedBy: ld.cleanReturnedBy || null,
        hospitalVerifiedAt: ld.hospitalVerifiedAt || null,
        hospitalVerifiedBy: ld.hospitalVerifiedBy || null,
        linkedSlipIds: JSON.stringify(ld.linkedSlipIds),
        isGuestBill: ld.isGuestBill || false,
        attachedImage: ld.attachedImage || null,
        guestName: ld.guestName || null,
        guestRoom: ld.guestRoom || null,
        dept: ld.dept || null,
        items: JSON.stringify(ld.items),
        lossNote: ld.lossNote || null
      }));
      if (formattedDispatches.length > 0) {
        await tx.insert(laundryDispatches).values(formattedDispatches);
      }
    });

    console.log('Database seeding completed successfully!');
  } catch (err) {
    console.error('Failed to seed database:', err);
  }
}

async function healUserPasswords() {
  if (!isDbConfigured()) {
    console.log('SQL Database is not configured. Skipping password heal.');
    return;
  }
  try {
    let dbUsers = await db.select().from(users);
    const { INITIAL_ACCOUNTS, INITIAL_USERS } = await import('./src/data.ts');
    
    let addedCount = 0;
    for (const acc of INITIAL_ACCOUNTS) {
      const exists = dbUsers.some(
        (u) => u.email.toLowerCase() === acc.email.toLowerCase() || 
               u.uid.toLowerCase() === `mock:${acc.username.toLowerCase()}`
      );
      if (!exists) {
        const correspondingUser = INITIAL_USERS[acc.userIdx] || null;
        const role = correspondingUser ? correspondingUser.role : (acc.isAdmin ? 0 : 2);
        const dept = correspondingUser ? correspondingUser.dept : 'Kho trung tâm';
        const passwordHash = acc.password ? bcrypt.hashSync(acc.password, 10) : bcrypt.hashSync('123456', 10);
        
        await db.insert(users).values({
          uid: `mock:${acc.username}`,
          email: acc.email,
          name: acc.name,
          role: role,
          dept: dept,
          status: acc.status,
          isAdmin: acc.isAdmin,
          passwordHash: passwordHash
        });
        addedCount++;
      }
    }
    if (addedCount > 0) {
      console.log(`Seeded ${addedCount} missing default accounts.`);
      // Refresh dbUsers list
      dbUsers = await db.select().from(users);
    }

    let healedCount = 0;
    for (const u of dbUsers) {
      if (!u.passwordHash) {
        // Find matching password in INITIAL_ACCOUNTS by email or username
        const matchingAcc = INITIAL_ACCOUNTS.find(
          (acc) => acc.email.toLowerCase() === u.email.toLowerCase() || 
                   acc.username.toLowerCase() === (u.uid.startsWith('mock:') ? u.uid.substring(5) : u.uid).toLowerCase()
        );
        const passwordToHash = matchingAcc ? matchingAcc.password : '123456';
        const newHash = bcrypt.hashSync(passwordToHash, 10);
        
        await db.update(users)
          .set({ passwordHash: newHash })
          .where(eq(users.id, u.id));
        healedCount++;
      }
    }
    if (healedCount > 0) {
      console.log(`Successfully healed ${healedCount} user accounts with password hashes.`);
    } else {
      console.log('All user accounts have valid password hashes.');
    }
  } catch (err) {
    console.error('Failed to heal user passwords and seed missing accounts:', err);
  }
}

// --- API ENDPOINTS & MOUNT ROUTERS ---

// Mount modular routers
app.use('/api/auth', authRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/delivery', deliveryRouter);
app.use('/api/reports', reportsRouter);

// Consolidation endpoint to fetch entire system state
app.get('/api/init', async (req, res) => {
  try {
    const inventoryData = await getInventoryData();
    const usersData = await getUsersData();
    const deliveryData = await getDeliveryData();
    const reportsData = await getReportsData();

    res.json({
      ...inventoryData,
      ...usersData,
      ...deliveryData,
      ...reportsData
    });
  } catch (err: any) {
    console.error('Error during init:', err);
    res.status(500).json({ error: 'Failed to retrieve database state' });
  }
});

// Sync complete master state in a single payload
app.post('/api/sync', async (req, res) => {
  try {
    const { 
      items, 
      detailAllocations, 
      users: reqUsers, 
      accounts, 
      history: reqHistory, 
      wardDeliverySlips, 
      laundryDispatches: reqDispatches,
      temporaryCleanStore,
      temporaryDirtyStore,
      temporaryCompanyDirtyStore
    } = req.body;

    // 1. Update in-memory store synchronously
    updateInMemoryStore(req.body);

    // 2. Sync to PostgreSQL if DB is configured
    if (isDbConfigured()) {
      try {
        await db.transaction(async (tx) => {
          await syncInventoryData(tx, items, detailAllocations);
          await syncUsersData(tx, accounts, reqUsers);
          await syncDeliveryData(
            tx, 
            wardDeliverySlips, 
            reqDispatches, 
            temporaryCleanStore, 
            temporaryDirtyStore, 
            temporaryCompanyDirtyStore
          );
          await syncReportsData(tx, reqHistory);
        });
      } catch (dbErr: any) {
        console.warn('PostgreSQL sync failed, but state updated in memory:', dbErr.message || dbErr);
      }
    }

    res.json({ success: true, message: 'Database state synchronized perfectly' });
  } catch (err: any) {
    console.error('Error during synchronization:', err);
    res.status(500).json({ error: 'Failed to sync state to database', details: err.message });
  }
});

// REST Endpoint: Force Database Reset/Re-seed
app.post('/api/reset', async (req, res) => {
  try {
    await db.transaction(async (tx) => {
      await tx.delete(history);
      await tx.delete(laundryDispatches);
      await tx.delete(deliverySlips);
      await tx.delete(deptAllocations);
      await tx.delete(linenItems);
      await tx.delete(users);
    });
    await seedDatabaseIfEmpty();
    res.json({ success: true, message: 'Database reset to default settings successfully' });
  } catch (err: any) {
    console.error('Database reset failed:', err);
    res.status(500).json({ error: 'Reset failed' });
  }
});

// Global error middleware to ensure JSON response for Vercel/Express
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: err?.message || 'Lỗi xử lý hệ thống trên máy chủ.' });
});

// --- VITE MIDDLEWARE CONFIGURATION ---
async function startServer() {
  // Boot schema seeder
  await seedDatabaseIfEmpty();
  // Heal pre-existing user passwords
  await healUserPasswords();

  if (process.env.VERCEL) {
    console.log('Running in Vercel serverless environment. Skipping HTTP server listener.');
    return;
  }

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running in ${process.env.NODE_ENV || 'development'} mode on http://localhost:${PORT}`);
  });
}

startServer();

export default app;
