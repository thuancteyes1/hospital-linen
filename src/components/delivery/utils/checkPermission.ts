/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Account, User, Role } from '../../../types';

export const checkPermission = (
  roleRequired: 'ward' | 'linen' | 'laundry' | 'clean' | 'housekeeping',
  simulatedRole: 'ward' | 'orderly' | 'housekeeping' | 'linen' | 'laundry' | 'clean' | 'all' | 'admin',
  currentAccount: Account | null,
  isLaundryUser: boolean,
  isOrderlyUser: boolean,
  isHousekeepingUser: boolean,
  effectiveIsWardUser: boolean,
  currentRoleName: string,
  hasLinenPerm: boolean
): boolean => {
  // Admin always has all permissions
  if (simulatedRole === 'admin' || (simulatedRole === 'all' && currentAccount?.isAdmin)) return true;

  // If simulatedRole is active (not 'all' and not 'admin')
  if (simulatedRole !== 'all') {
    if (roleRequired === 'ward') {
      return simulatedRole === 'ward' || simulatedRole === 'housekeeping' || simulatedRole === 'orderly';
    }
    if (roleRequired === 'housekeeping') {
      return simulatedRole === 'housekeeping' || simulatedRole === 'orderly';
    }
    if (roleRequired === 'linen' || roleRequired === 'clean') {
      return simulatedRole === 'linen' || simulatedRole === 'clean';
    }
    if (roleRequired === 'laundry') {
      return simulatedRole === 'laundry';
    }
    return false;
  }

  // Now check real account roles when simulatedRole === 'all'

  // 1. Action requires 'laundry' (Company Laundry action like declaring clean return bill step 4.1):
  // Strictly FORBIDDEN for Hospital Linen Staff / Ward users / Housekeeping / Orderly unless explicitly a laundry user.
  if (roleRequired === 'laundry') {
    if (isLaundryUser) return true;
    const roleLower = (currentRoleName || '').toLowerCase();
    if (roleLower.includes('xưởng') || roleLower.includes('giặt') || roleLower.includes('công ty') || roleLower.includes('laundry')) {
      return true;
    }
    return false;
  }

  // 2. Action requires 'ward' or 'housekeeping':
  if (roleRequired === 'ward' || roleRequired === 'housekeeping') {
    if (isOrderlyUser || isHousekeepingUser || effectiveIsWardUser) return true;
    const roleLower = (currentRoleName || '').toLowerCase();
    return roleLower.includes('hộ lý') || roleLower.includes('điều dưỡng') || roleLower.includes('khoa');
  }

  // 3. Action requires 'linen' or 'clean' (Hospital Central Linen / Clean store action):
  if (roleRequired === 'linen' || roleRequired === 'clean') {
    if (isLaundryUser || isOrderlyUser || isHousekeepingUser || effectiveIsWardUser) {
      return false;
    }
    if (hasLinenPerm) return true;
    const roleLower = (currentRoleName || '').toLowerCase();
    return roleLower.includes('đồ vải') || roleLower.includes('kho sạch') || roleLower.includes('thủ kho') || roleLower.includes('quản trị');
  }

  return false;
};
