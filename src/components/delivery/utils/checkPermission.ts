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

  // Now check real account roles
  if (isLaundryUser) {
    return roleRequired === 'laundry';
  }

  if (isOrderlyUser || isHousekeepingUser) {
    return roleRequired === 'ward' || roleRequired === 'housekeeping';
  }

  if (
    effectiveIsWardUser ||
    (currentRoleName || '').toLowerCase().includes('hộ lý') ||
    (currentRoleName || '').toLowerCase().includes('điều dưỡng')
  ) {
    return roleRequired === 'ward';
  }

  // Default to hasLinenPerm for general linen/clean actions, but prevent ward/laundry users
  if (roleRequired === 'linen' || roleRequired === 'clean') {
    return hasLinenPerm && !isLaundryUser && !isOrderlyUser && !isHousekeepingUser && !effectiveIsWardUser;
  }

  return true;
};
