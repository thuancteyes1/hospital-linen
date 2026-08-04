import { 
  INITIAL_LINEN_ITEMS, 
  INITIAL_DETAIL_ALLOCATIONS, 
  INITIAL_USERS, 
  INITIAL_ACCOUNTS, 
  INITIAL_WARD_DELIVERY_SLIPS, 
  INITIAL_LAUNDRY_DISPATCHES 
} from '../src/data.ts';

export function computeTempDirtyStoreFromSlips(slips: any[]): Record<string, number> {
  const store: Record<string, number> = {};
  if (!Array.isArray(slips)) return store;
  
  slips.forEach(s => {
    if ((s.status === 'verified_dirty' || s.status === 'confirmed') && !s.laundryDispatchId && Array.isArray(s.items)) {
      s.items.forEach((it: any) => {
        const ma = it.ma;
        const qty = it.verifiedDirtyQty !== undefined 
          ? Number(it.verifiedDirtyQty) 
          : (it.duyetThucTe !== undefined ? Number(it.duyetThucTe) : Number(it.khaiBao || it.qty || 0));
        if (ma && qty > 0) {
          store[ma] = (store[ma] || 0) + qty;
        }
      });
    }
  });
  return store;
}

export const inMemoryStore = {
  items: INITIAL_LINEN_ITEMS,
  detailAllocations: INITIAL_DETAIL_ALLOCATIONS,
  users: INITIAL_USERS,
  accounts: INITIAL_ACCOUNTS,
  history: [] as any[],
  wardDeliverySlips: INITIAL_WARD_DELIVERY_SLIPS,
  laundryDispatches: INITIAL_LAUNDRY_DISPATCHES,
  temporaryCleanStore: {} as Record<string, number>,
  temporaryDirtyStore: computeTempDirtyStoreFromSlips(INITIAL_WARD_DELIVERY_SLIPS),
  temporaryCompanyDirtyStore: {} as Record<string, number>
};

export function updateInMemoryStore(payload: any) {
  if (!payload) return;
  if (Array.isArray(payload.items)) inMemoryStore.items = payload.items;
  if (payload.detailAllocations) inMemoryStore.detailAllocations = payload.detailAllocations;
  if (Array.isArray(payload.users)) inMemoryStore.users = payload.users;
  if (Array.isArray(payload.accounts)) inMemoryStore.accounts = payload.accounts;
  if (Array.isArray(payload.history)) inMemoryStore.history = payload.history;
  if (Array.isArray(payload.wardDeliverySlips)) inMemoryStore.wardDeliverySlips = payload.wardDeliverySlips;
  if (Array.isArray(payload.laundryDispatches)) inMemoryStore.laundryDispatches = payload.laundryDispatches;
  
  if (payload.temporaryCleanStore) inMemoryStore.temporaryCleanStore = payload.temporaryCleanStore;
  if (payload.temporaryDirtyStore) {
    inMemoryStore.temporaryDirtyStore = payload.temporaryDirtyStore;
  } else if (Array.isArray(payload.wardDeliverySlips)) {
    inMemoryStore.temporaryDirtyStore = computeTempDirtyStoreFromSlips(payload.wardDeliverySlips);
  }
  if (payload.temporaryCompanyDirtyStore) inMemoryStore.temporaryCompanyDirtyStore = payload.temporaryCompanyDirtyStore;
}
