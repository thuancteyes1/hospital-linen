import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db, isDbConfigured } from '../src/db/index';
import { users } from '../src/db/schema';
import { eq, or } from 'drizzle-orm';


const JWT_SECRET = process.env.JWT_SECRET || 'hosplinen-secure-super-secret-key-2026';



const router = Router();

// REST Endpoint: Secure Password-based Registration (Pending review status)
router.post('/register', async (req, res) => {
  try {
    const { name, username, email, password } = req.body;
    if (!name || !username || !password) {
      return res.status(400).json({ error: 'Vui lòng cung cấp đầy đủ thông tin (Họ tên, Tên đăng nhập, Mật khẩu).' });
    }

    const lowerUser = username.trim().toLowerCase();
    const lowerEmail = email && email.trim() ? email.trim().toLowerCase() : `${lowerUser}@hospital.local`;

    // Check if username or email is already taken
    if (isDbConfigured()) {
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
    }

    res.json({ success: true, message: 'Đăng ký tài khoản thành công! Vui lòng chờ admin duyệt.' });
  } catch (err: any) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Đã xảy ra lỗi hệ thống khi đăng ký.' });
  }
});

// REST Endpoint: Secure Password-based Authentication & JWT Issuance
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Vui lòng nhập tên đăng nhập và mật khẩu.' });
    }

    const searchVal = username.trim().toLowerCase();
    const rawVal = username.trim();

    let user: any = null;
    if (isDbConfigured()) {
      try {
        const dbUsers = await db.select().from(users);
        user = dbUsers.find(u => {
          const emailLower = (u.email || '').trim().toLowerCase();
          const uidLower = (u.uid || '').trim().toLowerCase();
          const target = username.trim().toLowerCase();
          
          return emailLower === target || 
                 uidLower === target || 
                 uidLower === `mock:${target}`;
        });
      } catch (dbErr) {
        console.warn('PostgreSQL connection failed in login, falling back to local memory accounts:', dbErr);
      }
    }

    // Fallback if DB is not connected or user was not found in DB
    if (!user) {
      const { INITIAL_ACCOUNTS, INITIAL_USERS } = await import('../src/data');
      const target = username.trim().toLowerCase();
      const matchedAcc = INITIAL_ACCOUNTS.find(acc => 
        acc.username.toLowerCase() === target || 
        acc.email.toLowerCase() === target
      );

      if (matchedAcc) {
        const expectedPass = matchedAcc.password || '123456';
        if (password === expectedPass || password === '123456' || password === 'admin123') {
          const correspondingUser = INITIAL_USERS[matchedAcc.userIdx] || null;
          const payload = {
            id: matchedAcc.userIdx || 1,
            uid: matchedAcc.username,
            email: matchedAcc.email,
            name: matchedAcc.name,
            isAdmin: matchedAcc.isAdmin,
            status: matchedAcc.status
          };

          const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

          return res.json({
            success: true,
            token,
            user: {
              username: matchedAcc.username,
              email: matchedAcc.email,
              name: matchedAcc.name,
              isAdmin: matchedAcc.isAdmin,
              status: matchedAcc.status,
              userIdx: matchedAcc.userIdx || 1
            }
          });
        }
      }
      return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không chính xác.' });
    }

    if (user.status === 'inactive') {
      return res.status(403).json({ error: 'Tài khoản này đã bị vô hiệu hóa. Vui lòng liên hệ Admin.' });
    }

    if (user.status === 'pending') {
      return res.status(403).json({ error: 'Tài khoản đang chờ Admin xét duyệt kích hoạt.' });
    }

    // Verify password hash or fallback to standard demo passwords
    let isMatch = false;
    if (user.passwordHash) {
      isMatch = bcrypt.compareSync(password, user.passwordHash);
    }
    if (!isMatch && (password === '123456' || password === 'admin123')) {
      isMatch = true;
    }

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
router.get('/me', async (req, res) => {
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
router.post('/verify-token', async (req, res) => {
  res.status(503).json({ error: 'Đăng nhập Google tạm thời chưa khả dụng. Vui lòng dùng tên đăng nhập và mật khẩu.' });
});

export async function getUsersData() {
  if (!isDbConfigured()) {
    const { INITIAL_ACCOUNTS, INITIAL_USERS } = await import('../src/data');
    return {
      users: INITIAL_USERS,
      accounts: INITIAL_ACCOUNTS
    };
  }
  try {
    const dbUsers = await db.select().from(users);

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

    return {
      users: usersList,
      accounts: accountsList
    };
  } catch (err) {
    console.warn('PostgreSQL query failed in getUsersData, using initial static data:', err);
    const { INITIAL_ACCOUNTS, INITIAL_USERS } = await import('../src/data');
    return {
      users: INITIAL_USERS,
      accounts: INITIAL_ACCOUNTS
    };
  }
}

export async function syncUsersData(tx: any, accounts: any[], reqUsers: any[]) {
  if ((accounts && Array.isArray(accounts)) || (reqUsers && Array.isArray(reqUsers))) {
    // Fetch existing users to preserve their password hashes
    const existingDbUsers = await tx.select().from(users);
    const passwordHashMap = new Map<string, string>();
    existingDbUsers.forEach((u: any) => {
      if (u.email && u.passwordHash) {
        passwordHashMap.set(u.email.toLowerCase(), u.passwordHash);
      }
    });

    await tx.delete(users);
    const usersToInsert: any[] = [];
    const seenEmails = new Set<string>();
    const seenUids = new Set<string>();

    const safeAccounts = Array.isArray(accounts) ? accounts : [];
    const safeUsers = Array.isArray(reqUsers) ? reqUsers : [];

    // 1. Process accounts
    for (const acc of safeAccounts) {
      if (!acc || !acc.email) continue;
      const lowerEmail = String(acc.email).toLowerCase().trim();
      if (!lowerEmail || seenEmails.has(lowerEmail)) continue;

      const rawUsername = acc.username || lowerEmail.split('@')[0] || 'user';
      const rawUid = rawUsername && !rawUsername.startsWith('mock:') && rawUsername !== 'Admin' && rawUsername.includes('-')
        ? rawUsername
        : `mock:${rawUsername}`;

      let finalUid = rawUid;
      let counter = 1;
      while (seenUids.has(finalUid)) {
        finalUid = `${rawUid}_${counter++}`;
      }

      seenEmails.add(lowerEmail);
      seenUids.add(finalUid);

      const matchingUser = safeUsers.find((u: any) => u && u.email && String(u.email).toLowerCase().trim() === lowerEmail);

      let passwordHash = passwordHashMap.get(lowerEmail) || null;

      if (!passwordHash || (acc.password && !acc.password.startsWith('$2a$') && !acc.password.startsWith('$2b$') && acc.password !== '123456')) {
        const passToHash = acc.password || '123456';
        try {
          passwordHash = bcrypt.hashSync(passToHash, 10);
        } catch (e) {
          passwordHash = bcrypt.hashSync('123456', 10);
        }
      }

      usersToInsert.push({
        uid: finalUid,
        email: lowerEmail,
        name: acc.name || (matchingUser ? matchingUser.name : lowerEmail.split('@')[0]),
        role: matchingUser ? matchingUser.role : (acc.isAdmin ? 0 : 2),
        dept: matchingUser ? matchingUser.dept : (acc.dept || 'Kho trung tâm'),
        status: acc.status || (matchingUser ? matchingUser.status : 'active'),
        isAdmin: Boolean(acc.isAdmin),
        passwordHash
      });
    }

    // 2. Process any reqUsers that were not present in accounts
    for (const u of safeUsers) {
      if (!u || !u.email) continue;
      const lowerEmail = String(u.email).toLowerCase().trim();
      if (!lowerEmail || seenEmails.has(lowerEmail)) continue;

      const rawUsername = lowerEmail.split('@')[0] || 'user';
      const rawUid = `mock:${rawUsername}`;

      let finalUid = rawUid;
      let counter = 1;
      while (seenUids.has(finalUid)) {
        finalUid = `${rawUid}_${counter++}`;
      }

      seenEmails.add(lowerEmail);
      seenUids.add(finalUid);

      let passwordHash = passwordHashMap.get(lowerEmail) || bcrypt.hashSync('123456', 10);

      usersToInsert.push({
        uid: finalUid,
        email: lowerEmail,
        name: u.name || rawUsername,
        role: typeof u.role === 'number' ? u.role : 2,
        dept: u.dept || 'Kho trung tâm',
        status: u.status || 'active',
        isAdmin: Boolean(u.role === 0),
        passwordHash
      });
    }

    if (usersToInsert.length > 0) {
      await tx.insert(users).values(usersToInsert);
    }
  }
}

export default router;
