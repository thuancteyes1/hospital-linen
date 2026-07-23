import { Router } from 'express';
import { db } from '../src/db/index.ts';
import { linenItems, deptAllocations } from '../src/db/schema.ts';

const router = Router();

// Define any REST resource-specific endpoints here if needed
router.get('/', async (req, res) => {
  try {
    const data = await getInventoryData();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve inventory' });
  }
});

export async function getInventoryData() {
  const dbItems = await db.select().from(linenItems);
  const dbAllocations = await db.select().from(deptAllocations);

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
      hinhAnh: item.hinhAnh || undefined,
      trang: item.trang || 'Trang 1'
    };
  });

  return {
    items: itemsList,
    detailAllocations: detailAllocationsRecord
  };
}

export async function syncInventoryData(tx: any, items: any[], detailAllocations: any) {
  if (items) {
    await tx.delete(deptAllocations);
    await tx.delete(linenItems);

    const itemsToInsert = items.map((i: any) => ({
      ma: i.ma,
      ten: i.ten,
      nhom: i.nhom,
      kc: i.kc,
      mn: i.mn,
      hinhAnh: i.hinhAnh || null,
      trang: i.trang || 'Trang 1'
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
}

export default router;
