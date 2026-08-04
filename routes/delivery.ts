import { Router } from 'express';
import { db, isDbConfigured } from '../src/db/index.ts';
import { deliverySlips, laundryDispatches } from '../src/db/schema.ts';
import { inMemoryStore, computeTempDirtyStoreFromSlips, updateInMemoryStore } from './serverStore.ts';

const router = Router();

// Define any REST resource-specific endpoints here if needed
router.get('/', async (req, res) => {
  try {
    const data = await getDeliveryData();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve delivery data' });
  }
});

export async function getDeliveryData() {
  let slipsList: any[] = inMemoryStore.wardDeliverySlips;
  let dispatchesList: any[] = inMemoryStore.laundryDispatches;

  if (isDbConfigured()) {
    try {
      const dbSlips = await db.select().from(deliverySlips);
      const dbDispatches = await db.select().from(laundryDispatches);

      // Map slips
      slipsList = dbSlips.map((s) => ({
        ...s,
        items: JSON.parse(s.items)
      }));

      // Map dispatches
      dispatchesList = dbDispatches.map((d) => ({
        ...d,
        linkedSlipIds: JSON.parse(d.linkedSlipIds),
        items: JSON.parse(d.items)
      }));

      inMemoryStore.wardDeliverySlips = slipsList;
      inMemoryStore.laundryDispatches = dispatchesList;
    } catch (err) {
      console.warn('PostgreSQL query failed in getDeliveryData, falling back to inMemoryStore:', err);
      slipsList = inMemoryStore.wardDeliverySlips;
      dispatchesList = inMemoryStore.laundryDispatches;
    }
  }

  // Calculate dirty store if empty
  const dirtyStoreToReturn = Object.keys(inMemoryStore.temporaryDirtyStore).length > 0
    ? inMemoryStore.temporaryDirtyStore
    : computeTempDirtyStoreFromSlips(slipsList);

  return {
    wardDeliverySlips: slipsList,
    laundryDispatches: dispatchesList,
    temporaryCleanStore: inMemoryStore.temporaryCleanStore,
    temporaryDirtyStore: dirtyStoreToReturn,
    temporaryCompanyDirtyStore: inMemoryStore.temporaryCompanyDirtyStore
  };
}

export async function syncDeliveryData(
  tx: any, 
  wardDeliverySlips: any[], 
  reqDispatches: any[],
  temporaryCleanStore?: Record<string, number>,
  temporaryDirtyStore?: Record<string, number>,
  temporaryCompanyDirtyStore?: Record<string, number>
) {
  updateInMemoryStore({
    wardDeliverySlips,
    laundryDispatches: reqDispatches,
    temporaryCleanStore,
    temporaryDirtyStore,
    temporaryCompanyDirtyStore
  });

  // Sync Delivery Slips to DB if tx is present
  if (tx && wardDeliverySlips) {
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

  // Sync Laundry Dispatches to DB if tx is present
  if (tx && reqDispatches) {
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
}

export default router;
