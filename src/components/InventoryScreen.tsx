/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { LinenItem, DEPARTMENTS } from '../types';
import LinenStockSubscreen from './LinenStockSubscreen';
import { getLinenImage, getDefaultLinenImage, handleImageError, sanitizeImageUrl } from '../utils/imageUtils';

export { getLinenImage, getDefaultLinenImage, handleImageError, sanitizeImageUrl };

interface InventoryScreenProps {
  items: LinenItem[];
  detailAllocations: Record<string, [string, number][]>;
  temporaryCleanStore?: Record<string, number>;
  temporaryDirtyStore?: Record<string, number>;
  temporaryCompanyDirtyStore?: Record<string, number>;
  onAddItem: (item: LinenItem) => void;
  onEditItem: (origMa: string, updatedItem: LinenItem) => void;
  onDeleteItem: (ma: string) => void;
  onImportBackup: (file: File) => void;
  onExportBackup: () => void;
  onInitTest: () => void;
  onViewAllocations: (ma: string, ten: string) => void;
  onUpdateInventory?: (updatedItems: LinenItem[], updatedAllocations: Record<string, [string, number][]>) => void;
  isAdmin: boolean;
  canExportReport?: boolean;
  canSeeTrangBill?: boolean;
  canImportExcel?: boolean;
  canSeeStockWarning?: boolean;
  departments?: string[];
  userDept?: string;
}

export default function InventoryScreen({
  items,
  detailAllocations,
  temporaryCleanStore = {},
  temporaryDirtyStore = {},
  temporaryCompanyDirtyStore = {},
  onAddItem,
  onEditItem,
  onDeleteItem,
  onImportBackup,
  onExportBackup,
  onInitTest,
  onViewAllocations,
  onUpdateInventory,
  isAdmin,
  canExportReport = true,
  canSeeTrangBill = true,
  canImportExcel = true,
  canSeeStockWarning = true,
  departments = DEPARTMENTS,
  userDept
}: InventoryScreenProps) {
  return (
    <div className="space-y-6">
      <LinenStockSubscreen
        items={items}
        detailAllocations={detailAllocations}
        temporaryCleanStore={temporaryCleanStore}
        temporaryDirtyStore={temporaryDirtyStore}
        temporaryCompanyDirtyStore={temporaryCompanyDirtyStore}
        onAddItem={onAddItem}
        onEditItem={onEditItem}
        onDeleteItem={onDeleteItem}
        onInitTest={onInitTest}
        onViewAllocations={onViewAllocations}
        onUpdateInventory={onUpdateInventory}
        onExportBackup={onExportBackup}
        onImportBackup={onImportBackup}
        isAdmin={isAdmin}
        canExportReport={canExportReport}
        canSeeTrangBill={canSeeTrangBill}
        canImportExcel={canImportExcel}
        canSeeStockWarning={canSeeStockWarning}
        departments={departments}
        userDept={userDept}
        getLinenImage={getLinenImage}
      />
    </div>
  );
}
