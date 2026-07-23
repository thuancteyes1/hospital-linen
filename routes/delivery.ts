import { Router } from 'express';
import { db } from '../src/db/index.ts';
import { deliverySlips, laundryDispatches } from '../src/db/schema.ts';

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
  const dbSlips = await db.select().from(deliverySlips);
  const dbDispatches = await db.select().from(laundryDispatches);

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

  return {
    wardDeliverySlips: slipsList,
    laundryDispatches: dispatchesList
  };
}

export async function syncDeliveryData(tx: any, wardDeliverySlips: any[], reqDispatches: any[]) {
  // Sync Delivery Slips
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

  // Sync Laundry Dispatches
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
}

export default router;
