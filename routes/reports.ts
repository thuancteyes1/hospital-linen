import { Router } from 'express';
import { db } from '../src/db/index.ts';
import { history } from '../src/db/schema.ts';

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
}

export async function syncReportsData(tx: any, reqHistory: any[]) {
  // Sync history transactions logs
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
}

export default router;
