/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { LinenItem, DEPARTMENTS } from '../types';
import LinenStockSubscreen from './LinenStockSubscreen';

export function getLinenImage(item: LinenItem): string {
  if (item.hinhAnh && (item.hinhAnh.trim().startsWith('http') || item.hinhAnh.trim().startsWith('data:image/'))) {
    return item.hinhAnh;
  }
  
  const name = (item.ten || '').toLowerCase();
  const group = (item.nhom || '').toLowerCase();
  
  if (name.includes('phòng mổ') || name.includes('ptv') || name.includes('áo choàng') || name.includes('đồng phục') || name.includes('blouse') || name.includes('đầm') || name.includes('váy') || name.includes('quần') || group.includes('trang phục')) {
    return 'https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?auto=format&fit=crop&w=600&q=80';
  }
  if (name.includes('gối') || name.includes('mền') || name.includes('ruột') || group.includes('mền')) {
    return 'https://images.unsplash.com/photo-1540518614846-7eded433c457?auto=format&fit=crop&w=600&q=80';
  }
  if (name.includes('khăn') || group.includes('khăn')) {
    return 'https://images.unsplash.com/photo-1546554137-f86b9593a222?auto=format&fit=crop&w=600&q=80';
  }
  if (name.includes('drap') || name.includes('săng') || name.includes('sheet') || group.includes('drap') || group.includes('săng') || group.includes('sheet')) {
    return 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=600&q=80';
  }
  if (name.includes('túi') || group.includes('túi')) {
    return 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80';
  }
  
  return 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=600&q=80';
}

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
        isAdmin={isAdmin}
        departments={departments}
        userDept={userDept}
        getLinenImage={getLinenImage}
      />
    </div>
  );
}
