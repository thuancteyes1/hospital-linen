import { Router } from 'express';
import { db, isDbConfigured } from '../src/db/index';
import { linenItems, deptAllocations } from '../src/db/schema';

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
    const { INITIAL_LINEN_ITEMS, INITIAL_DETAIL_ALLOCATIONS } = await import('../src/data');
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
    const { INITIAL_LINEN_ITEMS, INITIAL_DETAIL_ALLOCATIONS } = await import('../src/data');
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
  if (items && Array.isArray(items)) {
    await tx.delete(deptAllocations);
    await tx.delete(linenItems);

    const seenMas = new Set<string>();
    const itemsToInsert = [];

    for (const i of items) {
      if (!i || !i.ma) continue;
      const maKey = String(i.ma).trim();
      if (seenMas.has(maKey)) continue;
      seenMas.add(maKey);

      itemsToInsert.push({
        ma: maKey,
        ten: i.ten || maKey,
        nhom: i.nhom || 'Đồ vải chung',
        kc: typeof i.kc === 'number' ? i.kc : 0,
        mn: typeof i.mn === 'number' ? i.mn : 20,
        hinhAnh: i.hinhAnh || null,
        trang: i.trang || 'Trang 1',
        tempClean: temporaryCleanStore?.[maKey] || 0,
        tempDirty: temporaryDirtyStore?.[maKey] || 0,
        tempCompanyDirty: temporaryCompanyDirtyStore?.[maKey] || 0
      });
    }

    if (itemsToInsert.length > 0) {
      await tx.insert(linenItems).values(itemsToInsert);
    }

    if (detailAllocations && typeof detailAllocations === 'object') {
      const allocationsToInsert: any[] = [];
      const seenAllocKeys = new Set<string>();

      Object.entries(detailAllocations).forEach(([itemMa, allocs]: [string, any]) => {
        const maKey = String(itemMa).trim();
        if (!seenMas.has(maKey)) return;

        if (Array.isArray(allocs)) {
          allocs.forEach(([dept, qty]: [string, number]) => {
            if (!dept) return;
            const key = `${maKey}__${dept}`;
            if (seenAllocKeys.has(key)) return;
            seenAllocKeys.add(key);

            allocationsToInsert.push({
              itemMa: maKey,
              dept: String(dept),
              qty: typeof qty === 'number' ? qty : 0
            });
          });
        }
      });

      if (allocationsToInsert.length > 0) {
        await tx.insert(deptAllocations).values(allocationsToInsert);
      }
    }
  }
}

export default router;