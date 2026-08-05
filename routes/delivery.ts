import { Router } from 'express';
import { db, isDbConfigured } from '../src/db/index';
import { deliverySlips, laundryDispatches } from '../src/db/schema';

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
  if (!isDbConfigured()) {
    const { INITIAL_WARD_DELIVERY_SLIPS, INITIAL_LAUNDRY_DISPATCHES } = await import('../src/data');
    return {
      wardDeliverySlips: INITIAL_WARD_DELIVERY_SLIPS,
      laundryDispatches: INITIAL_LAUNDRY_DISPATCHES
    };
  }
  try {
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
  } catch (err) {
    console.warn('PostgreSQL query failed in getDeliveryData, falling back to static data:', err);
    const { INITIAL_WARD_DELIVERY_SLIPS, INITIAL_LAUNDRY_DISPATCHES } = await import('../src/data');
    return {
      wardDeliverySlips: INITIAL_WARD_DELIVERY_SLIPS,
      laundryDispatches: INITIAL_LAUNDRY_DISPATCHES
    };
  }
}

export async function syncDeliveryData(tx: any, wardDeliverySlips: any[], reqDispatches: any[]) {
  // Sync Delivery Slips
  if (wardDeliverySlips && Array.isArray(wardDeliverySlips)) {
    await tx.delete(deliverySlips);
    const seenSlipIds = new Set<string>();
    const slipsToInsert = [];

    for (const slip of wardDeliverySlips) {
      if (!slip || !slip.id) continue;
      const sId = String(slip.id).trim();
      if (seenSlipIds.has(sId)) continue;
      seenSlipIds.add(sId);

      slipsToInsert.push({
        id: sId,
        dept: slip.dept || 'N/A',
        createdAt: slip.createdAt || new Date().toISOString(),
        createdBy: slip.createdBy || 'Hệ thống',
        originalSlipId: slip.originalSlipId || null,
        originalCreatedAt: slip.originalCreatedAt || null,
        receiver: slip.receiver || null,
        status: slip.status || 'pending',
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
        isGuestSlip: Boolean(slip.isGuestSlip),
        isRewash: Boolean(slip.isRewash),
        attachedImage: slip.attachedImage || null,
        guestName: slip.guestName || null,
        guestRoom: slip.guestRoom || null,
        items: JSON.stringify(slip.items || [])
      });
    }

    if (slipsToInsert.length > 0) {
      await tx.insert(deliverySlips).values(slipsToInsert);
    }
  }

  // Sync Laundry Dispatches
  if (reqDispatches && Array.isArray(reqDispatches)) {
    await tx.delete(laundryDispatches);
    const seenDispatchIds = new Set<string>();
    const dispatchesToInsert = [];

    for (const ld of reqDispatches) {
      if (!ld || !ld.id) continue;
      const dId = String(ld.id).trim();
      if (seenDispatchIds.has(dId)) continue;
      seenDispatchIds.add(dId);

      dispatchesToInsert.push({
        id: dId,
        createdAt: ld.createdAt || new Date().toISOString(),
        originalDispatchId: ld.originalDispatchId || null,
        originalCreatedAt: ld.originalCreatedAt || null,
        contractor: ld.contractor || 'Cty Giặt',
        driver: ld.driver || 'N/A',
        plate: ld.plate || 'N/A',
        status: ld.status || 'pending_laundry',
        laundryReceivedAt: ld.laundryReceivedAt || null,
        laundryReceivedBy: ld.laundryReceivedBy || null,
        cleanReturnedAt: ld.cleanReturnedAt || null,
        cleanReturnedBy: ld.cleanReturnedBy || null,
        hospitalVerifiedAt: ld.hospitalVerifiedAt || null,
        hospitalVerifiedBy: ld.hospitalVerifiedBy || null,
        linkedSlipIds: JSON.stringify(ld.linkedSlipIds || []),
        isGuestBill: Boolean(ld.isGuestBill),
        attachedImage: ld.attachedImage || null,
        guestName: ld.guestName || null,
        guestRoom: ld.guestRoom || null,
        dept: ld.dept || null,
        items: JSON.stringify(ld.items || []),
        lossNote: ld.lossNote || null
      });
    }

    if (dispatchesToInsert.length > 0) {
      await tx.insert(laundryDispatches).values(dispatchesToInsert);
    }
  }
}

export default router;
