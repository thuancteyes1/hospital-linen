import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import * as dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from './src/db/index.ts';
import { users, linenItems, deptAllocations, deliverySlips, laundryDispatches, history } from './src/db/schema.ts';
import { eq, or } from 'drizzle-orm';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import firebaseConfig from './firebase-applet-config.json';

// Initialize dotenv
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'hosplinen-secure-super-secret-key-2026';

// Initialize Firebase Admin
if (!getApps().length) {
  initializeApp({
    projectId: firebaseConfig.projectId,
  });
}
const adminAuth = getAdminAuth();

const app = express();
app.use(express.json({ limit: '50mb' }));

const PORT = 3000;

// --- DATABASE SEEDING ON STARTUP ---
async function seedDatabaseIfEmpty() {
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
        hinhAnh: item.hinhAnh || null
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
  try {
    const dbUsers = await db.select().from(users);
    const { INITIAL_ACCOUNTS } = await import('./src/data.ts');
    
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
    console.error('Failed to heal user passwords:', err);
  }
}

// --- API ENDPOINTS ---

// Consolidation endpoint to fetch entire system state
app.get('/api/init', async (req, res) => {
  try {
    const dbItems = await db.select().from(linenItems);
    const dbAllocations = await db.select().from(deptAllocations);
    const dbUsers = await db.select().from(users);
    const dbSlips = await db.select().from(deliverySlips);
    const dbDispatches = await db.select().from(laundryDispatches);
    const dbHistory = await db.select().from(history);

    // Map department allocations into Record<string, [string, number][]>
    const detailAllocationsRecord: Record<string, [string, number][]> = {};
    dbAllocations.forEach((alloc) => {
      if (!detailAllocationsRecord[alloc.itemMa]) {
        detailAllocationsRecord[alloc.itemMa] = [];
      }
      detailAllocationsRecord[alloc.itemMa].push([alloc.dept, alloc.qty]);
    });

    // Reconstruct items with custom kp
    const itemsList = dbItems.map((item) => {
      const kpSum = (detailAllocationsRecord[item.ma] || []).reduce((sum, r) => sum + r[1], 0);
      return {
        ma: item.ma,
        ten: item.ten,
        nhom: item.nhom,
        kc: item.kc,
        kp: kpSum,
        mn: item.mn,
        hinhAnh: item.hinhAnh || undefined
      };
    });

    // Map slips
    const slipsList = dbSlips.map((s) => ({
      ...s,
      items: JSON.parse(s.items)
    }));

    // Map dispatches
    const dispatchesList = dbDispatches.map((d) => ({
      ...d,
      linkedSlipIds: JSON.parse(d.linkedSlipIds),
      items: JSON.parse(d.items)
    }));

    // Map history log
    const historyList = dbHistory.map((h) => ({
      id: h.id,
      type: h.type as any,
      date: h.date,
      user: h.user,
      note: h.note,
      from: h.fromDept,
      to: h.toDept,
      items: JSON.parse(h.items),
      status: h.status as any,
      rejectReason: h.rejectReason || undefined,
      confirmedBy: h.confirmedBy || undefined,
      confirmedAt: h.confirmedAt || undefined,
      movementApplied: h.movementApplied,
      createdAt: h.createdAt || undefined,
      creatorDept: h.creatorDept || undefined
    }));

    // Map accounts and users
    const accountsList = dbUsers.map((u) => ({
      username: u.uid.startsWith('mock:') ? u.uid.substring(5) : u.uid,
      email: u.email,
      name: u.name,
      isAdmin: u.isAdmin,
      status: u.status as any,
      userIdx: u.id
    }));

    const usersList = dbUsers.map((u) => ({
      name: u.name,
      email: u.email,
      role: u.role,
      dept: u.dept,
      status: u.status as any
    }));

    res.json({
      items: itemsList,
      detailAllocations: detailAllocationsRecord,
      users: usersList,
      accounts: accountsList,
      history: historyList,
      wardDeliverySlips: slipsList,
      laundryDispatches: dispatchesList
    });
  } catch (err: any) {
    console.error('Error during init:', err);
    res.status(500).json({ error: 'Failed to retrieve database state' });
  }
});

// Sync complete master state in a single payload
app.post('/api/sync', async (req, res) => {
  try {
    const { items, detailAllocations, users: reqUsers, accounts, history: reqHistory, wardDeliverySlips, laundryDispatches: reqDispatches } = req.body;

    await db.transaction(async (tx) => {
      // 1. Sync linen items
      if (items) {
        await tx.delete(deptAllocations);
        await tx.delete(linenItems);

        const itemsToInsert = items.map((i: any) => ({
          ma: i.ma,
          ten: i.ten,
          nhom: i.nhom,
          kc: i.kc,
          mn: i.mn,
          hinhAnh: i.hinhAnh || null
        }));
        if (itemsToInsert.length > 0) {
          await tx.insert(linenItems).values(itemsToInsert);
        }

        // Sync detailed allocations
        if (detailAllocations) {
          const allocationsToInsert: any[] = [];
          Object.entries(detailAllocations).forEach(([itemMa, allocs]: [string, any]) => {
            allocs.forEach(([dept, qty]: [string, number]) => {
              allocationsToInsert.push({
                itemMa,
                dept,
                qty
              });
            });
          });
          if (allocationsToInsert.length > 0) {
            await tx.insert(deptAllocations).values(allocationsToInsert);
          }
        }
      }

      // 2. Sync Users / Accounts
      if (accounts) {
        // Fetch existing users to preserve their password hashes
        const existingDbUsers = await tx.select().from(users);
        const passwordHashMap = new Map<string, string>();
        existingDbUsers.forEach((u) => {
          if (u.email && u.passwordHash) {
            passwordHashMap.set(u.email.toLowerCase(), u.passwordHash);
          }
        });

        await tx.delete(users);
        const usersToInsert = [];
        for (const acc of accounts) {
          const matchingUser = reqUsers ? reqUsers.find((u: any) => u.email === acc.email) : null;
          let passwordHash = passwordHashMap.get(acc.email.toLowerCase()) || null;

          // If a new password is provided, hash it. Otherwise preserve current hash,
          // or fallback to hashing '123456' for seeded/initial accounts.
          if (acc.password) {
            passwordHash = bcrypt.hashSync(acc.password, 10);
          } else if (!passwordHash) {
            passwordHash = bcrypt.hashSync('123456', 10);
          }

          usersToInsert.push({
            uid: acc.username && !acc.username.startsWith('mock:') && acc.username !== 'Admin' && acc.username.includes('-') ? acc.username : `mock:${acc.username || 'user'}`,
            email: acc.email,
            name: acc.name,
            role: matchingUser ? matchingUser.role : (acc.isAdmin ? 0 : 2),
            dept: matchingUser ? matchingUser.dept : 'NICU',
            status: acc.status || 'active',
            isAdmin: acc.isAdmin || false,
            passwordHash
          });
        }
        if (usersToInsert.length > 0) {
          await tx.insert(users).values(usersToInsert);
        }
      }

      // 3. Sync Delivery Slips
      if (wardDeliverySlips) {
        await tx.delete(deliverySlips);
        const slipsToInsert = wardDeliverySlips.map((slip: any) => ({
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
        if (slipsToInsert.length > 0) {
          await tx.insert(deliverySlips).values(slipsToInsert);
        }
      }

      // 4. Sync Laundry Dispatches
      if (reqDispatches) {
        await tx.delete(laundryDispatches);
        const dispatchesToInsert = reqDispatches.map((ld: any) => ({
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
        if (dispatchesToInsert.length > 0) {
          await tx.insert(laundryDispatches).values(dispatchesToInsert);
        }
      }

      // 5. Sync history transactions logs
      if (reqHistory) {
        await tx.delete(history);
        const historyToInsert = reqHistory.map((h: any) => ({
          id: h.id,
          type: h.type,
          date: h.date,
          user: h.user,
          note: h.note,
          fromDept: h.from,
          toDept: h.to,
          items: JSON.stringify(h.items),
          status: h.status,
          rejectReason: h.rejectReason || null,
          confirmedBy: h.confirmedBy || null,
          confirmedAt: h.confirmedAt || null,
          movementApplied: h.movementApplied || false,
          createdAt: h.createdAt || null,
          creatorDept: h.creatorDept || null
        }));
        if (historyToInsert.length > 0) {
          await tx.insert(history).values(historyToInsert);
        }
      }
    });

    res.json({ success: true, message: 'Database state synchronized perfectly' });
  } catch (err: any) {
    console.error('Error during synchronization:', err);
    res.status(500).json({ error: 'Failed to sync state to database', details: err.message });
  }
});

// REST Endpoint: Secure Password-based Registration (Pending review status)
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, username, email, password } = req.body;
    if (!name || !username || !email || !password) {
      return res.status(400).json({ error: 'Vui lòng cung cấp đầy đủ thông tin.' });
    }

    const lowerUser = username.trim().toLowerCase();
    const lowerEmail = email.trim().toLowerCase();

    // Check if username or email is already taken
    const existing = await db.select()
      .from(users)
      .where(
        or(
          eq(users.email, lowerEmail),
          eq(users.uid, lowerUser),
          eq(users.uid, `mock:${lowerUser}`)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Tên đăng nhập hoặc email đã được sử dụng.' });
    }

    const hash = bcrypt.hashSync(password, 10);

    await db.insert(users).values({
      uid: lowerUser,
      email: lowerEmail,
      name: name.trim(),
      role: 2, // clinical default
      dept: 'NICU', // default department
      status: 'pending',
      isAdmin: false,
      passwordHash: hash
    });

    res.json({ success: true, message: 'Đăng ký tài khoản thành công! Vui lòng chờ admin duyệt.' });
  } catch (err: any) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Đã xảy ra lỗi hệ thống khi đăng ký.' });
  }
});

// REST Endpoint: Secure Password-based Authentication & JWT Issuance
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Vui lòng nhập tên đăng nhập và mật khẩu.' });
    }

    const searchVal = username.trim().toLowerCase();
    const rawVal = username.trim();

    const userRecord = await db.select()
      .from(users)
      .where(
        or(
          eq(users.email, searchVal),
          eq(users.email, rawVal),
          eq(users.uid, searchVal),
          eq(users.uid, rawVal),
          eq(users.uid, `mock:${searchVal}`),
          eq(users.uid, `mock:${rawVal}`)
        )
      )
      .limit(1);

    if (userRecord.length === 0) {
      return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không chính xác.' });
    }

    const user = userRecord[0];

    if (user.status === 'inactive') {
      return res.status(403).json({ error: 'Tài khoản này đã bị vô hiệu hóa. Vui lòng liên hệ Admin.' });
    }

    if (user.status === 'pending') {
      return res.status(403).json({ error: 'Tài khoản đang chờ Admin xét duyệt kích hoạt.' });
    }

    // If passwordHash is empty (e.g. Google Login only user trying password login)
    if (!user.passwordHash) {
      return res.status(401).json({ error: 'Tài khoản này được cấu hình đăng nhập qua Google. Vui lòng sử dụng đăng nhập Google.' });
    }

    const isMatch = bcrypt.compareSync(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không chính xác.' });
    }

    const payload = {
      id: user.id,
      uid: user.uid,
      email: user.email,
      name: user.name,
      isAdmin: user.isAdmin,
      status: user.status
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      token,
      user: {
        username: user.uid.startsWith('mock:') ? user.uid.substring(5) : user.uid,
        email: user.email,
        name: user.name,
        isAdmin: user.isAdmin,
        status: user.status,
        userIdx: user.id
      }
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Đã xảy ra lỗi hệ thống khi đăng nhập.' });
  }
});

// REST Endpoint: Fetch Currently Logged-in User Context using JWT
app.get('/api/auth/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Yêu cầu quyền truy cập xác thực.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    const userRecord = await db.select()
      .from(users)
      .where(eq(users.id, decoded.id))
      .limit(1);

    if (userRecord.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng.' });
    }

    const user = userRecord[0];
    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Tài khoản không hoạt động.' });
    }

    res.json({
      uid: user.uid.startsWith('mock:') ? user.uid.substring(5) : user.uid,
      email: user.email,
      name: user.name,
      isAdmin: user.isAdmin,
      status: user.status,
      userIdx: user.id
    });
  } catch (err: any) {
    res.status(401).json({ error: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.' });
  }
});

// REST Endpoint: Verify ID token and synchronize/return user context
app.post('/api/auth/verify-token', async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) {
    return res.status(401).json({ error: 'Missing ID token' });
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const { uid, email, name } = decodedToken;

    // Check if user already exists in PostgreSQL
    let userRecord = await db.select().from(users).where(eq(users.uid, uid)).limit(1);

    if (userRecord.length === 0) {
      // Create user record for new Google Login user
      const result = await db.insert(users).values({
        uid,
        email: email || '',
        name: name || email || 'Hospital User',
        role: 2, // Default to nurse role
        dept: 'NICU',
        status: 'active',
        isAdmin: false
      }).returning();
      userRecord = result;
    }

    res.json({
      uid: userRecord[0].uid,
      email: userRecord[0].email,
      name: userRecord[0].name,
      role: userRecord[0].role,
      dept: userRecord[0].dept,
      status: userRecord[0].status,
      isAdmin: userRecord[0].isAdmin
    });
  } catch (error: any) {
    console.error('Error verifying token:', error);
    res.status(401).json({ error: 'Invalid ID Token' });
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
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running in ${process.env.NODE_ENV || 'development'} mode on http://localhost:${PORT}`);
  });
}

startServer();

export default app;
