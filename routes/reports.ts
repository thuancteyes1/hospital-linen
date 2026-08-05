import { Router } from 'express';
import { db, isDbConfigured } from '../src/db/index';
import { history } from '../src/db/schema';

const router = Router();

// Define any REST resource-specific endpoints here if needed
router.get('/', async (req, res) => {
  try {
    const data = await getReportsData();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve reports data' });
  }
});

export async function getReportsData() {
  if (!isDbConfigured()) {
    return { history: [] };
  }
  try {
    const dbHistory = await db.select().from(history);

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

    return {
      history: historyList
    };
  } catch (err) {
    console.warn('PostgreSQL query failed in getReportsData, returning empty history:', err);
    return { history: [] };
  }
}

export async function syncReportsData(tx: any, reqHistory: any[]) {
  // Sync history transactions logs
  if (reqHistory && Array.isArray(reqHistory)) {
    await tx.delete(history);
    const seenIds = new Set<string>();
    const historyToInsert = [];

    for (const h of reqHistory) {
      if (!h || !h.id) continue;
      const hId = String(h.id).trim();
      if (seenIds.has(hId)) continue;
      seenIds.add(hId);

      historyToInsert.push({
        id: hId,
        type: h.type || 'nhap',
        date: h.date || new Date().toISOString(),
        user: h.user || 'Admin',
        note: h.note || '',
        fromDept: h.from || 'Kho trung tâm',
        toDept: h.to || 'N/A',
        items: JSON.stringify(h.items || []),
        status: h.status || 'completed',
        rejectReason: h.rejectReason || null,
        confirmedBy: h.confirmedBy || null,
        confirmedAt: h.confirmedAt || null,
        movementApplied: Boolean(h.movementApplied),
        createdAt: h.createdAt || null,
        creatorDept: h.creatorDept || null
      });
    }

    if (historyToInsert.length > 0) {
      await tx.insert(history).values(historyToInsert);
    }
  }
}

export default router;
