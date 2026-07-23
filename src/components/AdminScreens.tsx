/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Role, User, Account, PendingRegistration, DEPARTMENTS } from '../types';
import RoleManagement from './admin/RoleManagement';
import UserManagement from './admin/UserManagement';
import DepartmentManagement from './admin/DepartmentManagement';

interface AdminScreensProps {
  roles: Role[];
  users: User[];
  accounts: Account[];
  pendingRegs: PendingRegistration[];
  onUpdateRoles: (updatedRoles: Role[], updatedUsers?: User[]) => void;
  onUpdateUsers: (updatedUsers: User[], updatedAccounts: Account[], updatedPendingRegs?: PendingRegistration[]) => void;
  onUpdatePendingRegs: (updatedPendingRegs: PendingRegistration[]) => void;
  activeSubTab: 'roles' | 'users' | 'depts';
  departments?: string[];
  onUpdateDepartments?: (newDepts: string[], renameMapping?: { oldName: string; newName: string }, deletedName?: string) => void;
  isAdmin?: boolean;
  detailAllocations?: Record<string, [string, number][]>;
}

export default function AdminScreens({
  roles,
  users,
  accounts,
  pendingRegs,
  onUpdateRoles,
  onUpdateUsers,
  onUpdatePendingRegs,
  activeSubTab,
  departments = DEPARTMENTS,
  onUpdateDepartments,
  detailAllocations = {}
}: AdminScreensProps) {
  return (
    <div className="fade-in space-y-6">
      {activeSubTab === 'roles' && (
        <RoleManagement
          roles={roles}
          users={users}
          onUpdateRoles={onUpdateRoles}
        />
      )}

      {activeSubTab === 'users' && (
        <UserManagement
          roles={roles}
          users={users}
          accounts={accounts}
          pendingRegs={pendingRegs}
          onUpdateUsers={onUpdateUsers}
          onUpdatePendingRegs={onUpdatePendingRegs}
          departments={departments}
        />
      )}

      {activeSubTab === 'depts' && (
        <DepartmentManagement
          departments={departments}
          detailAllocations={detailAllocations}
          onUpdateDepartments={onUpdateDepartments}
        />
      )}
    </div>
  );
}
