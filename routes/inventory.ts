import { Router } from 'express';
import { db, isDbConfigured } from '../src/db/index.ts';
import { linenItems, deptAllocations } from '../src/db/schema.ts';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const data = await getInventoryData();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve inventory' });
  }
});

export async function getInventoryData() {
  if (!isDbConfigured()) {
    const { INITIAL_LINEN_ITEMS, INITIAL_DETAIL_ALLOCATIONS } = await import('../src/data.ts');
    return {
      items: INITIAL_LINEN_ITEMS,
      detailAllocations: INITIAL_DETAIL_ALLOCATIONS,
      temporaryCleanStore: {},
      temporaryDirtyStore: {},
      temporaryCompanyDirtyStore: {}
    };
  }
  try {
    const dbItems = await db.select().from(linenItems);
    const dbAllocations = await db.select().from(deptAllocations);

    const detailAllocationsRecord: Record<string, [string, number][]> = {};
    dbAllocations.forEach((alloc) => {
      if (!detailAllocationsRecord[alloc.itemMa]) {
        detailAllocationsRecord[alloc.itemMa] = [];
      }
      detailAllocationsRecord[alloc.itemMa].push([alloc.dept, alloc.qty]);
    });

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

    const temporaryCleanStore: Record<string, number> = {};
    const temporaryDirtyStore: Record<string, number> = {};
    const temporaryCompanyDirtyStore: Record<string, number> = {};
    dbItems.forEach((item: any) => {
      if (item.tempClean) temporaryCleanStore[item.ma] = item.tempClean;
      if (item.tempDirty) temporaryDirtyStore[item.ma] = item.tempDirty;
      if (item.tempCompanyDirty) temporaryCompanyDirtyStore[item.ma] = item.tempCompanyDirty;
    });

    return {
      items: itemsList,
      detailAllocations: detailAllocationsRecord,
      temporaryCleanStore,
      temporaryDirtyStore,
      temporaryCompanyDirtyStore
    };
  } catch (err) {
    console.warn('PostgreSQL query failed in getInventoryData, falling back to static data:', err);
    const { INITIAL_LINEN_ITEMS, INITIAL_DETAIL_ALLOCATIONS } = await import('../src/data.ts');
    return {
      items: INITIAL_LINEN_ITEMS,
      detailAllocations: INITIAL_DETAIL_ALLOCATIONS,
      temporaryCleanStore: {},
      temporaryDirtyStore: {},
      temporaryCompanyDirtyStore: {}
    };
  }
}

export async function syncInventoryData(
  tx: any,
  items: any[],
  detailAllocations: any,
  temporaryCleanStore: Record<string, number> = {},
  temporaryDirtyStore: Record<string, number> = {},
  temporaryCompanyDirtyStore: Record<string, number> = {}
) {
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
      trang: i.trang || 'Trang 1',
      tempClean: temporaryCleanStore?.[i.ma] || 0,
      tempDirty: temporaryDirtyStore?.[i.ma] || 0,
      tempCompanyDirty: temporaryCompanyDirtyStore?.[i.ma] || 0
    }));
    if (itemsToInsert.length > 0) {
      await tx.insert(linenItems).values(itemsToInsert);
    }

    if (detailAllocations) {
      const allocationsToInsert: any[] = [];
      Object.entries(detailAllocations).forEach(([itemMa, allocs]: [string, any]) => {
        allocs.forEach(([dept, qty]: [string, number]) => {
          allocationsToInsert.push({ itemMa, dept, qty });
        });
      });
      if (allocationsToInsert.length > 0) {
        await tx.insert(deptAllocations).values(allocationsToInsert);
      }
    }
  }
}

export default router;
