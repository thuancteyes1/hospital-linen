/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { LinenItem, HistoryItem, DEPARTMENTS, User, Role } from '../types';
import { ArrowLeftRight, ClipboardList, CheckSquare, XCircle, Clock, Plus, Trash, AlertTriangle, Check, X } from 'lucide-react';

interface TransactionScreenProps {
  items: LinenItem[];
  detailAllocations: Record<string, [string, number][]>;
  history: HistoryItem[];
  currentAccount: any;
  users?: User[];
  roles?: Role[];
  onSubmitTransaction: (tx: {
    type: 'nhap' | 'thuhoi' | 'xuat' | 'huy' | 'dc';
    date: string;
    user: string;
    note: string;
    fromDept: string;
    toDept: string;
    items: Array<{ ma: string; qty: number }>;
    supplier?: string;
  }) => void;
  onConfirmXuat: (id: string) => void;
  onRejectXuat: (id: string, reason: string) => void;
  onDeleteTransaction?: (id: string) => void;
  onUpdateTransaction?: (id: string, tx: {
    type: 'nhap' | 'thuhoi' | 'xuat' | 'huy' | 'dc';
    date: string;
    user: string;
    note: string;
    fromDept: string;
    toDept: string;
    items: Array<{ ma: string; qty: number }>;
    supplier?: string;
  }) => void;
  departments?: string[];
  userDept?: string;
}

interface FormLine {
  ma: string;
  qty: number;
}

export const normalizeDept = (name: string): string => {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/^(khoa|phòng|kho)\s+/i, '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

export default function TransactionScreen({
  items,
  detailAllocations,
  history,
  currentAccount,
  users = [],
  roles = [],
  onSubmitTransaction,
  onConfirmXuat,
  onRejectXuat,
  onDeleteTransaction,
  onUpdateTransaction,
  departments = DEPARTMENTS,
  userDept: propUserDept
}: TransactionScreenProps) {
  // Transaction form states
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [txType, setTxType] = useState<'nhap' | 'thuhoi' | 'xuat' | 'huy' | 'dc' | ''>('');
  const [txDate, setTxDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [operator, setOperator] = useState(currentAccount?.name || '');
  const [fromDept, setFromDept] = useState('');
  const [toDept, setToDept] = useState('');
  const [supplier, setSupplier] = useState('');
  const [note, setNote] = useState('');
  
  // Dynamic line items list
  const [formLines, setFormLines] = useState<FormLine[]>([{ ma: '', qty: 1 }]);
  const [submitError, setSubmitError] = useState('');

  // History list filter
  const [historyFilter, setHistoryFilter] = useState('');

  // 1) Helper: Check if logged-in user is department restricted
  const userDept = propUserDept !== undefined
    ? propUserDept
    : (currentAccount?.isAdmin ? 'Tất cả' : (currentAccount?.userIdx !== undefined ? currentAccount.name : ''));
  
  // Find full user record to extract ward restriction
  const currentUserRecord = useMemo(() => {
    let targetRoleIdx = 2; // Default ward role index
    if (currentAccount) {
      const username = currentAccount.username || '';
      const nameLower = (currentAccount.name || '').toLowerCase();
      const isHl = username === 'sim.hl' || username === 'lan.hl' || username === 'tai.hl' || nameLower.includes('hộ lý');
      const isDd = username === 'sim.dd' || username === 'mai.dd' || username === 'hoa.dd' || username === 'ngoc.dd' || nameLower.includes('điều dưỡng');
      const isNv = username === 'sim.clean' || username === 'minh.nv' || (nameLower.includes('nhân viên đồ vải') && !nameLower.includes('trưởng kho'));
      const isTk = username === 'sim.tk' || username === 'an.nv' || nameLower.includes('trưởng kho');

      if (isHl) {
        const hlIdx = roles.findIndex(r => (r.name || '').toLowerCase().includes('hộ lý'));
        targetRoleIdx = hlIdx !== -1 ? hlIdx : 5;
      } else if (isDd) {
        const ddIdx = roles.findIndex(r => (r.name || '').toLowerCase().includes('điều dưỡng'));
        targetRoleIdx = ddIdx !== -1 ? ddIdx : 2;
      } else if (isNv) {
        const nvIdx = roles.findIndex(r => (r.name || '').toLowerCase().includes('nhân viên đồ vải') && !(r.name || '').toLowerCase().includes('trưởng kho'));
        targetRoleIdx = nvIdx !== -1 ? nvIdx : 1;
      } else if (isTk) {
        const tkIdx = roles.findIndex(r => (r.name || '').toLowerCase().includes('trưởng kho'));
        targetRoleIdx = tkIdx !== -1 ? tkIdx : 0;
      } else {
        const u = users[currentAccount.userIdx] || users.find(x => x.email === currentAccount.email);
        if (u && u.role !== undefined) targetRoleIdx = u.role;
      }
    }
    if (propUserDept && propUserDept !== 'Tất cả' && propUserDept !== 'Tất cả (Không giới hạn)' && propUserDept !== 'Kho trung tâm') {
      return { dept: propUserDept, role: targetRoleIdx };
    }
    if (!currentAccount) return null;
    const u = users[currentAccount.userIdx] || users.find(x => x.email === currentAccount.email);
    if (u) {
      return { dept: u.dept, role: targetRoleIdx };
    }
    const username = currentAccount.username;
    const hlIdx = roles.findIndex(r => (r.name || '').toLowerCase().includes('hộ lý'));
    const defaultRoleIdx = username === 'mai.dd' || username === 'hoa.dd' || username === 'ngoc.dd' ? 2 :
                           username === 'lan.hl' || username === 'tai.hl' || username === 'sim.hl' ? (hlIdx !== -1 ? hlIdx : 5) :
                           username === 'an.nv' ? 0 : 4;
    return {
      dept: currentAccount.isAdmin ? 'Tất cả' : (currentAccount.username === 'mai.dd' ? 'Khoa Cấp cứu đa khoa' :
            currentAccount.username === 'hoa.dd' ? 'NICU' :
            currentAccount.username === 'ngoc.dd' ? 'Phòng sanh' :
            currentAccount.username === 'tai.hl' ? 'Kho trung tâm' :
            currentAccount.username === 'lan.hl' ? 'Gây mê hồi sức' :
            currentAccount.username === 'an.nv' ? 'Kho trung tâm' : 'Tất cả'),
      role: defaultRoleIdx
    };
  }, [currentAccount, users, propUserDept, roles]);

  const userDeptMatch = useMemo(() => {
    const raw = currentUserRecord?.dept || propUserDept || '';
    if (!raw || raw === 'Tất cả' || raw === 'Tất cả (Không giới hạn)' || raw === 'Kho trung tâm') return '';
    const rawLower = raw.trim().toLowerCase();
    const found = departments.find(d => d.toLowerCase() === rawLower || d.toLowerCase().includes(rawLower) || rawLower.includes(d.toLowerCase()));
    return found || raw;
  }, [currentUserRecord, propUserDept, departments]);

  const isRestricted = useMemo(() => {
    if (userDeptMatch) return true;
    if (!currentUserRecord) return false;
    const dept = currentUserRecord.dept;
    return dept && dept !== 'Tất cả' && dept !== 'Tất cả (Không giới hạn)' && dept !== 'Kho trung tâm';
  }, [currentUserRecord, userDeptMatch]);

  // Clean visual labels for form conditional states
  const txConfig = useMemo(() => {
    switch (txType) {
      case 'nhap':
        return { label: 'Nhập mua', showFrom: false, showTo: false, showSupplier: true, badge: 'bg-[#D1FAE5] text-[#065F46]' };
      case 'thuhoi':
        return { label: 'Thu hồi từ khoa', showFrom: true, showTo: false, showSupplier: false, badge: 'bg-[#DBEAFE] text-[#1E40AF]' };
      case 'xuat':
        return { label: 'Xuất cho khoa', showFrom: false, showTo: true, showSupplier: false, badge: 'bg-[#FEF3C7] text-[#92400E]' };
      case 'huy':
        return { label: 'Xuất hủy', showFrom: false, showTo: false, showSupplier: true, badge: 'bg-[#FEE2E2] text-[#991B1B]' };
      case 'dc':
        return { label: 'Điều chuyển Khoa → Khoa', showFrom: true, showTo: true, showSupplier: false, badge: 'bg-[#E5E7EB] text-[#374151]' };
      default:
        return { label: 'Chọn nghiệp vụ', showFrom: false, showTo: false, showSupplier: false, badge: '' };
    }
  }, [txType]);

  // Compute allowed transactions based on user's authorized role
  const userPermissions = useMemo(() => {
    const username = currentAccount?.username || '';
    const nameLower = (currentAccount?.name || '').toLowerCase();
    const isSimulatedRole = username.startsWith('sim.') || nameLower.includes('điều dưỡng') || nameLower.includes('hộ lý') || nameLower.includes('nhân viên đồ vải');

    if (currentAccount?.isAdmin && !isSimulatedRole) {
      return {
        nhap: true,
        thuhoi: true,
        xuat: true,
        huy: true,
        dc: true,
        dovai: true
      };
    }

    // 1. Check Hộ lý -> no transaction creation perms
    const isHl = username === 'sim.hl' || 
                 username === 'lan.hl' || 
                 username === 'tai.hl' || 
                 nameLower.includes('hộ lý') ||
                 (currentAccount?.email || '').toLowerCase().includes('.hl') ||
                 (currentAccount?.email || '').toLowerCase().includes('holy') ||
                 (currentUserRecord && roles && roles[currentUserRecord.role] && (roles[currentUserRecord.role].name || '').toLowerCase().includes('hộ lý'));
    if (isHl) {
      return { nhap: false, thuhoi: false, xuat: false, huy: false, dc: false, dovai: true };
    }

    // 2. Check Điều dưỡng -> ONLY thu hoi allowed
    const isDd = username === 'sim.dd' || 
                 username === 'mai.dd' || 
                 username === 'hoa.dd' || 
                 username === 'ngoc.dd' || 
                 nameLower.includes('điều dưỡng') ||
                 (currentUserRecord && roles && roles[currentUserRecord.role] && (roles[currentUserRecord.role].name || '').toLowerCase().includes('điều dưỡng'));
    if (isDd) {
      return { nhap: false, thuhoi: true, xuat: false, huy: false, dc: false, dovai: false };
    }

    // 3. Check Nhân viên đồ vải -> nhap, thuhoi, xuat allowed, BUT NOT huy (Xuất hủy)
    const isNv = username === 'sim.clean' || 
                 username === 'minh.nv' || 
                 (nameLower.includes('nhân viên đồ vải') && !nameLower.includes('trưởng kho')) ||
                 (currentUserRecord && roles && roles[currentUserRecord.role] && (roles[currentUserRecord.role].name || '').toLowerCase().includes('nhân viên đồ vải') && !(roles[currentUserRecord.role].name || '').toLowerCase().includes('trưởng kho'));
    if (isNv) {
      return { nhap: true, thuhoi: true, xuat: true, huy: false, dc: true, dovai: true };
    }

    // 4. Check Trưởng kho đồ vải
    const isTk = username === 'sim.tk' || 
                 username === 'an.nv' || 
                 nameLower.includes('trưởng kho') ||
                 (currentUserRecord && roles && roles[currentUserRecord.role] && (roles[currentUserRecord.role].name || '').toLowerCase().includes('trưởng kho'));
    if (isTk) {
      return { nhap: true, thuhoi: true, xuat: true, huy: true, dc: true, dovai: true };
    }

    if (currentUserRecord && roles && roles[currentUserRecord.role]) {
      const perms = { ...roles[currentUserRecord.role].perms };
      const roleNameLower = (roles[currentUserRecord.role].name || '').toLowerCase();
      if (roleNameLower.includes('điều dưỡng')) {
        return { nhap: false, thuhoi: true, xuat: false, huy: false, dc: false, dovai: false };
      }
      if (roleNameLower.includes('nhân viên đồ vải') && !roleNameLower.includes('trưởng kho')) {
        perms.huy = false;
      }
      return perms;
    }

    if (propUserDept && propUserDept !== 'Tất cả' && propUserDept !== 'Tất cả (Không giới hạn)' && propUserDept !== 'Kho trung tâm') {
      return { nhap: false, thuhoi: true, xuat: false, huy: false, dc: false, dovai: false };
    }

    return {
      nhap: true,
      thuhoi: true,
      xuat: true,
      huy: true,
      dc: true,
      dovai: true
    };
  }, [currentAccount, currentUserRecord, roles, propUserDept]);

  const hasAnyCreatePerm = userPermissions.nhap || userPermissions.thuhoi || userPermissions.xuat || userPermissions.huy || userPermissions.dc;

  // Auto-sync selected txType and default fromDept based on user permissions
  React.useEffect(() => {
    if (txType && !userPermissions[txType]) {
      if (userPermissions.thuhoi) {
        setTxType('thuhoi');
      } else if (userPermissions.nhap) {
        setTxType('nhap');
      } else if (userPermissions.xuat) {
        setTxType('xuat');
      } else if (userPermissions.huy) {
        setTxType('huy');
      } else {
        setTxType('');
      }
    }
  }, [userPermissions, txType]);

  React.useEffect(() => {
    if (userPermissions.thuhoi && !userPermissions.nhap && !userPermissions.xuat && !userPermissions.huy) {
      if (!txType) setTxType('thuhoi');
    }
  }, [userPermissions, txType]);

  React.useEffect(() => {
    if (isRestricted && userDeptMatch) {
      if (txConfig.showFrom && fromDept !== userDeptMatch) {
        setFromDept(userDeptMatch);
      }
      if (txConfig.showTo && toDept !== userDeptMatch) {
        setToDept(userDeptMatch);
      }
    }
  }, [isRestricted, userDeptMatch, txConfig.showFrom, txConfig.showTo, fromDept, toDept]);

  // 2) Helper: Live Stock lookup for any item at selected source location
  const getLiveStock = (ma: string): { label: string; qty: number } => {
    const item = items.find(i => i.ma === ma);
    if (!item) return { label: 'Tồn kho', qty: 0 };

    let baseQty = 0;
    if (txType === 'nhap' || txType === 'huy' || txType === 'xuat') {
      baseQty = item.kc;
    } else if (txType === 'thuhoi' || txType === 'dc') {
      const depts = detailAllocations[ma] || [];
      const dRecord = depts.find(d => d[0] === fromDept);
      baseQty = dRecord ? dRecord[1] : 0;
    } else {
      baseQty = item.kc;
    }

    // If editing, add back the quantity of the original transaction before strict validation
    if (editingTxId) {
      const origTx = history.find(h => h.id === editingTxId);
      if (origTx && origTx.movementApplied) {
        const origItem = origTx.items.find(i => i.ma === ma);
        if (origItem) {
          const qty = origItem.qty;
          if (origTx.type === 'nhap' && (txType === 'nhap' || txType === 'huy' || txType === 'xuat')) {
            baseQty = Math.max(0, baseQty - qty);
          } else if (origTx.type === 'huy' && (txType === 'nhap' || txType === 'huy' || txType === 'xuat')) {
            baseQty += qty;
          } else if (origTx.type === 'thuhoi') {
            if (txType === 'nhap' || txType === 'huy' || txType === 'xuat') {
              baseQty = Math.max(0, baseQty - qty);
            } else if ((txType === 'thuhoi' || txType === 'dc') && fromDept === origTx.from) {
              baseQty += qty;
            }
          } else if (origTx.type === 'dc') {
            if (txType === 'thuhoi' || txType === 'dc') {
              if (fromDept === origTx.from) {
                baseQty += qty;
              }
              if (fromDept === origTx.to) {
                baseQty = Math.max(0, baseQty - qty);
              }
            }
          } else if (origTx.type === 'xuat') {
            if (txType === 'nhap' || txType === 'huy' || txType === 'xuat') {
              baseQty += qty;
            } else if ((txType === 'thuhoi' || txType === 'dc') && fromDept === origTx.to) {
              baseQty = Math.max(0, baseQty - qty);
            }
          }
        }
      }
    }

    let label = 'Tồn kho';
    if (txType === 'nhap' || txType === 'huy' || txType === 'xuat') {
      label = 'Tồn Kho chính';
    } else if (txType === 'thuhoi') {
      label = `Tồn tại ${fromDept || 'Khoa'}`;
    } else if (txType === 'dc') {
      label = `Tồn tại ${fromDept || 'Khoa nguồn'}`;
    }

    return { label, qty: baseQty };
  };

  // 3) Line Item modification handlers
  const addLine = () => {
    setFormLines([...formLines, { ma: '', qty: 1 }]);
  };

  const removeLine = (idx: number) => {
    if (formLines.length > 1) {
      setFormLines(formLines.filter((_, i) => i !== idx));
    } else {
      setFormLines([{ ma: '', qty: 1 }]);
    }
  };

  const updateLine = (idx: number, field: keyof FormLine, value: any) => {
    const next = [...formLines];
    if (field === 'qty') {
      next[idx].qty = Math.max(1, parseInt(value) || 1);
    } else {
      next[idx].ma = value;
    }
    setFormLines(next);
  };

  // 4) Duplicate selected items validation
  const duplicateCode = useMemo(() => {
    const codes = formLines.map(l => l.ma).filter(Boolean);
    const seen = new Set();
    for (const c of codes) {
      if (seen.has(c)) return c;
      seen.add(c);
    }
    return '';
  }, [formLines]);

  // 6) Form submit and strict balance check validation
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    if (!txType) {
      setSubmitError('Vui lòng chọn loại nghiệp vụ để bắt đầu.');
      return;
    }
    if (txType && !userPermissions[txType]) {
      setSubmitError('Tài khoản của bạn không được phân quyền thực hiện nghiệp vụ này.');
      return;
    }
    if (txConfig.showFrom && !fromDept) {
      setSubmitError('Vui lòng chọn khoa/phòng nguồn.');
      return;
    }
    if (txConfig.showTo && !toDept) {
      setSubmitError('Vui lòng chọn khoa/phòng đích nhận.');
      return;
    }
    if (txConfig.showFrom && txConfig.showTo && fromDept === toDept) {
      setSubmitError('Khoa nguồn và khoa nhận hàng không được trùng nhau.');
      return;
    }

    const validLines = formLines.filter(l => l.ma && l.qty > 0);
    if (validLines.length === 0) {
      setSubmitError('Vui lòng chọn ít nhất một mặt hàng đồ vải với số lượng lớn hơn 0.');
      return;
    }

    if (duplicateCode) {
      const duplicateItem = items.find(i => i.ma === duplicateCode);
      setSubmitError(`Mặt hàng "${duplicateItem?.ten || duplicateCode}" bị chọn trùng. Vui lòng gộp hoặc thay đổi dòng.`);
      return;
    }

    // Live balance checking
    for (const line of validLines) {
      const stock = getLiveStock(line.ma);
      if ((txType === 'xuat' || txType === 'huy') && stock.qty < line.qty) {
        const item = items.find(i => i.ma === line.ma);
        setSubmitError(`Mặt hàng "${item?.ten}" chỉ còn tồn ${stock.qty} cái trong Kho chính. Không đủ để thực hiện xuất ${line.qty} cái.`);
        return;
      }
      if ((txType === 'thuhoi' || txType === 'dc') && stock.qty < line.qty) {
        const item = items.find(i => i.ma === line.ma);
        setSubmitError(`Khoa "${fromDept}" chỉ có ${stock.qty} cái "${item?.ten}". Không đủ để thực hiện giao dịch ${line.qty} cái.`);
        return;
      }
    }

    // All clear! Dispatch
    if (editingTxId && onUpdateTransaction) {
      onUpdateTransaction(editingTxId, {
        type: txType as any,
        date: txDate,
        user: operator || 'Người thực hiện',
        note: note.trim(),
        fromDept: txConfig.showFrom ? fromDept : 'Kho chính',
        toDept: txConfig.showTo ? toDept : 'Kho chính',
        items: validLines,
        supplier: txConfig.showSupplier ? supplier : undefined
      });
      setEditingTxId(null);
    } else {
      onSubmitTransaction({
        type: txType as any,
        date: txDate,
        user: operator || 'Người thực hiện',
        note: note.trim(),
        fromDept: txConfig.showFrom ? fromDept : 'Kho chính',
        toDept: txConfig.showTo ? toDept : 'Kho chính',
        items: validLines,
        supplier: txConfig.showSupplier ? supplier : undefined
      });
    }

    // Reset Form
    setTxType('');
    setFromDept('');
    setToDept('');
    setSupplier('');
    setNote('');
    setFormLines([{ ma: '', qty: 1 }]);
  };

  // 7) Filter history records based on restricted credentials
  const currentDeptNormalized = useMemo(() => {
    return normalizeDept(currentUserRecord?.dept || '');
  }, [currentUserRecord]);

  const visibleHistory = useMemo(() => {
    let list = [...history];

    // Filter by department restrictions (Nurses / Wards see only their own dept's deliveries)
    if (isRestricted && currentDeptNormalized) {
      list = list.filter(h => {
        const fromNorm = normalizeDept(h.from);
        const toNorm = normalizeDept(h.to);
        return fromNorm === currentDeptNormalized || toNorm === currentDeptNormalized;
      });
    }

    // Filter by search dropdown
    if (historyFilter) {
      if (['pending_dept', 'confirmed', 'rejected'].includes(historyFilter)) {
        list = list.filter(h => h.status === historyFilter);
      } else {
        list = list.filter(h => h.type === historyFilter);
      }
    }

    return list;
  }, [history, isRestricted, currentDeptNormalized, historyFilter]);

  // Determine if a transaction can be approved by the logged-in operator
  const canApprove = (h: HistoryItem) => {
    if (h.status !== 'pending_dept') return false;
    
    const userW = currentDeptNormalized;
    const itemW = normalizeDept(h.to);
    
    // If receiver is "Kho chính" (meaning thuhoi) or "Kho trung tâm", then users of "Kho trung tâm" or admins can approve
    if (itemW === 'chinh' || itemW === 'trung tam') {
      return currentAccount?.isAdmin || userW === 'trung tam';
    }
    
    // Otherwise, check if recipient matches user's ward
    return userW && userW === itemW;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 fade-in">
      
      {/* ── COLUMN 1 & 2: TRANSACTIONS ENTRY FORM ─────────────────────────── */}
      <div className="lg:col-span-2 space-y-6">
        <div className="border border-[#1A1A1A] p-1 bg-[#F5F2ED]">
          <div className="border border-[#1A1A1A] p-5">
            
            <div className="flex justify-between items-center mb-6 pb-2 border-b border-[#1A1A1A]">
              <div className="flex items-center gap-2">
                <ArrowLeftRight className="text-[#C4432A]" size={20} />
                <h3 className="font-serif font-black text-lg text-[#1A1A1A]">
                  {editingTxId ? `Sửa Phiếu Nghiệp Vụ: ${editingTxId}` : 'Tạo Phiếu Nhập / Xuất Kho'}
                </h3>
              </div>
              {txType && (
                <span className={`text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 ${txConfig.badge}`}>
                  {txConfig.label}
                </span>
              )}
            </div>

            {submitError && (
              <div className="mb-4 p-3 border border-[#C4432A] bg-[#FDF2F0] text-xs text-[#C4432A] font-semibold">
                {submitError}
              </div>
            )}

            {!hasAnyCreatePerm ? (
              <div className="py-12 px-6 text-center bg-[#EBE8E3]/60 border border-[#1A1A1A]/20 rounded-xl my-4">
                <div className="w-12 h-12 bg-amber-100 text-amber-800 border border-amber-300 rounded-full flex items-center justify-center mx-auto mb-3.5 shadow-sm text-xl">
                  🔒
                </div>
                <h4 className="font-serif font-bold text-base text-[#1A1A1A] mb-1.5">
                  Không Có Quyền Tạo Phiếu Kho
                </h4>
                <p className="text-xs text-[#555] max-w-md mx-auto leading-relaxed">
                  Tài khoản Hộ lý hoặc vai trò hiện tại của bạn không được phân quyền tạo phiếu xuất, nhập, thu hồi hay điều chuyển kho đồ vải. Bạn chỉ có quyền thực hiện giao nhận đồ dơ và nhận đồ sạch tại phân hệ <strong>Phiếu Giao/Nhận</strong>.
                </p>
              </div>
            ) : (
              <form onSubmit={handleFormSubmit} className="space-y-4">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A] mb-1">
                    Loại nghiệp vụ <span className="text-[#C4432A]">*</span>
                  </label>
                  <select
                    value={txType}
                    onChange={e => {
                      const newType = e.target.value as any;
                      setTxType(newType);
                      setFromDept(isRestricted && userDeptMatch ? userDeptMatch : '');
                      setToDept(isRestricted && userDeptMatch ? userDeptMatch : '');
                      setSupplier('');
                      setSubmitError('');
                    }}
                    className="w-full bg-[#EBE8E3] border border-[#1A1A1A] p-2 text-xs focus:outline-none"
                  >
                    <option value="">-- Chọn loại nghiệp vụ --</option>
                    {userPermissions.nhap && <option value="nhap">Nhập mua (Hàng mới về Kho chính)</option>}
                    {userPermissions.thuhoi && <option value="thuhoi">Thu hồi (Khoa trả về Kho chính)</option>}
                    {userPermissions.xuat && <option value="xuat">Xuất cho khoa (Xuất từ Kho chính đi)</option>}
                    {userPermissions.huy && <option value="huy">Xuất hủy (Hủy rách hỏng từ Kho chính)</option>}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A] mb-1">
                    Ngày thực hiện
                  </label>
                  <input
                    type="date"
                    value={txDate}
                    onChange={e => setTxDate(e.target.value)}
                    className="w-full bg-[#EBE8E3] border border-[#1A1A1A] p-2 text-xs focus:outline-none font-mono"
                  />
                </div>

                {/* Conditional fields based on selected transaction category */}
                {txConfig.showFrom && (
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A] mb-1">
                      Khoa lâm sàng giao / Nguồn <span className="text-[#C4432A]">*</span>
                    </label>
                    <select
                      value={fromDept}
                      onChange={e => setFromDept(e.target.value)}
                      disabled={isRestricted && !!userDeptMatch}
                      className="w-full bg-[#EBE8E3] border border-[#1A1A1A] p-2 text-xs focus:outline-none disabled:opacity-80 disabled:bg-[#E0DDD7] font-semibold"
                    >
                      {(!isRestricted || !userDeptMatch) && <option value="">-- Chọn khoa bàn giao --</option>}
                      {(isRestricted && userDeptMatch ? [userDeptMatch] : departments.filter(d => d !== 'Kho trung tâm')).map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                )}

                {txConfig.showTo && (
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A] mb-1">
                      Khoa lâm sàng nhận / Đích <span className="text-[#C4432A]">*</span>
                    </label>
                    <select
                      value={toDept}
                      onChange={e => setToDept(e.target.value)}
                      disabled={isRestricted && !!userDeptMatch}
                      className="w-full bg-[#EBE8E3] border border-[#1A1A1A] p-2 text-xs focus:outline-none disabled:opacity-80 disabled:bg-[#E0DDD7] font-semibold"
                    >
                      {(!isRestricted || !userDeptMatch) && <option value="">-- Chọn khoa nhận hàng --</option>}
                      {(isRestricted && userDeptMatch ? [userDeptMatch] : departments.filter(d => d !== 'Kho trung tâm')).map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                )}

                {txConfig.showSupplier && (
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A] mb-1">
                      {txType === 'nhap' ? 'Nhà cung cấp đồ vải' : 'Lý do thanh lý / Hủy bỏ'}
                    </label>
                    <input
                      type="text"
                      placeholder={txType === 'nhap' ? 'Công ty Dệt may ABC...' : 'Hỏng rách nhiều, cháy mốc...'}
                      value={supplier}
                      onChange={e => setSupplier(e.target.value)}
                      className="w-full bg-[#EBE8E3] border border-[#1A1A1A] p-2 text-xs focus:outline-none"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A] mb-1">
                    Người thực hiện thao tác
                  </label>
                  <input
                    type="text"
                    required
                    value={operator}
                    onChange={e => setOperator(e.target.value)}
                    className="w-full bg-[#EBE8E3] border border-[#1A1A1A] p-2 text-xs focus:outline-none"
                  />
                </div>

              </div>

              {/* Duplicate warnings banner */}
              {duplicateCode && (
                <div className="p-2 border border-[#C4432A] bg-[#FDF2F0] text-[11px] text-[#C4432A] flex items-center gap-1.5 font-semibold">
                  <AlertTriangle size={14} />
                  Phát hiện chọn trùng đồ vải. Mỗi loại chỉ được phép chọn 1 lần trong 1 phiếu!
                </div>
              )}

              {/* Dynamic Line items list */}
              <div className="pt-4 border-t border-[#1A1A1A] border-dashed">
                <span className="block text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A] mb-3">
                  Danh sách mặt hàng giao nhận ({formLines.length})
                </span>

                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {formLines.map((line, idx) => {
                    const stock = line.ma ? getLiveStock(line.ma) : null;

                    // Filter items for dropdown if txType is 'thuhoi' or 'dc'
                    let availableItems = items;
                    if (txType === 'thuhoi' || txType === 'dc') {
                      if (!fromDept) {
                        availableItems = [];
                      } else {
                        availableItems = items.filter(i => {
                          const s = getLiveStock(i.ma);
                          return s.qty > 0 || i.ma === line.ma;
                        });
                      }
                    }

                    return (
                      <div key={idx} className="flex gap-2 items-center">
                        <div className="flex-1">
                          <select
                            value={line.ma}
                            onChange={e => {
                              updateLine(idx, 'ma', e.target.value);
                              setSubmitError('');
                            }}
                            className="w-full bg-[#EBE8E3] border border-[#1A1A1A] p-2 text-xs focus:outline-none"
                          >
                            {!fromDept && (txType === 'thuhoi' || txType === 'dc') ? (
                              <option value="">-- Vui lòng chọn khoa giao trước --</option>
                            ) : (txType === 'thuhoi' || txType === 'dc') && availableItems.length === 0 ? (
                              <option value="">-- Khoa này hiện không có đồ vải tồn kho --</option>
                            ) : (
                              <option value="">-- Chọn đồ vải --</option>
                            )}
                            {availableItems.map(i => {
                              const itemStock = (txType === 'thuhoi' || txType === 'dc') && fromDept ? getLiveStock(i.ma).qty : null;
                              return (
                                <option key={i.ma} value={i.ma}>
                                  {i.ten} ({i.ma}) {itemStock !== null ? `- Tồn: ${itemStock}` : ''}
                                </option>
                              );
                            })}
                          </select>
                        </div>

                        {/* Live stock balance tracker display */}
                        {stock && (
                          <div className="w-40 bg-[#EBE8E3] p-2 text-[10px] font-mono border border-[#1A1A1A] text-right">
                            {stock.label}: <span className="font-bold text-[#2563EB]">{stock.qty}</span>
                          </div>
                        )}

                        <div className="w-20">
                          <input
                            type="number"
                            min="1"
                            value={line.qty}
                            onChange={e => updateLine(idx, 'qty', e.target.value)}
                            placeholder="SL"
                            className="w-full bg-[#EBE8E3] border border-[#1A1A1A] p-2 text-xs text-center focus:outline-none font-mono font-semibold"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => removeLine(idx)}
                          className="p-2 border border-[#1A1A1A] hover:bg-[#C4432A] hover:text-white transition-colors"
                          title="Xóa dòng"
                        >
                          <Trash size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={addLine}
                  className="mt-3 px-3 py-1.5 border border-[#1A1A1A] hover:bg-[#EBE8E3] text-[11px] font-bold uppercase tracking-wider transition-colors inline-flex items-center gap-1"
                >
                  <Plus size={12} />
                  Thêm dòng mới
                </button>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A] mb-1">
                  Ghi chú nghiệp vụ / Biên bản chênh lệch
                </label>
                <textarea
                  rows={2}
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Ghi chú thêm thông tin chênh lệch, đền bù hoặc lý do khác..."
                  className="w-full bg-[#EBE8E3] border border-[#1A1A1A] p-2 text-xs focus:outline-none"
                />
              </div>

              <div className="pt-4 border-t border-[#1A1A1A] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTxType('');
                    setFromDept('');
                    setToDept('');
                    setSupplier('');
                    setNote('');
                    setFormLines([{ ma: '', qty: 1 }]);
                    setSubmitError('');
                    if (editingTxId) setEditingTxId(null);
                  }}
                  className="px-4 py-2 border border-[#1A1A1A] text-xs font-semibold uppercase tracking-wider hover:bg-[#EBE8E3]"
                >
                  {editingTxId ? 'Hủy chỉnh sửa' : 'Nhập lại'}
                </button>
                <button
                  type="submit"
                  disabled={!txType || !!duplicateCode}
                  className="px-4 py-2 bg-[#1A1A1A] text-[#F5F2ED] text-xs font-semibold uppercase tracking-widest hover:bg-[#C4432A] hover:border-[#C4432A] border border-[#1A1A1A] transition-colors disabled:opacity-40 disabled:hover:bg-[#1A1A1A]"
                >
                  {editingTxId ? 'Cập nhật phiếu & tồn kho' : 'Thực hiện & cập nhật tồn kho'}
                </button>
              </div>

            </form>
            )}

          </div>
        </div>
      </div>

      {/* ── COLUMN 3: TRANSACTIONS HISTORY LOG & DEPT SCORING ─────────────── */}
      <div className="space-y-6">
        <div className="border border-[#1A1A1A] bg-[#EBE8E3] p-4 flex flex-col gap-3">
          <div className="flex justify-between items-center pb-2 border-b border-[#1A1A1A] border-dashed">
            <span className="font-serif font-black text-sm text-[#1A1A1A]">Lịch Sử Nghiệp Vụ</span>
            <span className="font-mono text-[10px] bg-[#1A1A1A] text-white px-2 py-0.5">
              {visibleHistory.length} phiếu
            </span>
          </div>

          <div>
            <label className="block text-[9px] uppercase tracking-wider font-bold text-[#8C8984] mb-1">
              Bộ lọc phiếu cần xem
            </label>
            <select
              value={historyFilter}
              onChange={e => setHistoryFilter(e.target.value)}
              className="w-full bg-[#F5F2ED] border border-[#1A1A1A] p-2 text-xs focus:outline-none"
            >
              <option value="">Tất cả phiếu</option>
              <option value="nhap">Nhập mua</option>
              <option value="xuat">Xuất cho khoa</option>
              <option value="thuhoi">Thu hồi từ khoa</option>
              <option value="huy">Xuất hủy</option>
              <option value="dc">Điều chuyển</option>
              <option value="pending_dept">Chờ khoa xác nhận</option>
              <option value="confirmed">Đã xác nhận</option>
              <option value="rejected">Không đúng / Từ chối</option>
            </select>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {visibleHistory.length === 0 ? (
              <div className="py-8 text-center text-[#8C8984] text-xs font-serif italic">
                Chưa ghi nhận giao dịch nào phù hợp.
              </div>
            ) : (
              visibleHistory.map(h => {
                const isPending = h.status === 'pending_dept';
                const isRejected = h.status === 'rejected';
                const userCanApprove = canApprove(h);

                const showEditDelete = (() => {
                  // Non-pending xuat, dc, thuhoi cannot be edited/deleted by non-admins
                  if (h.status !== 'pending_dept' && !currentAccount?.isAdmin) {
                    return false;
                  }
                  
                  // Admin can edit/delete eligible transactions
                  if (currentAccount?.isAdmin) {
                    return true;
                  }

                  // Non-admin creator department can edit/delete their own pending transactions
                  if (h.status === 'pending_dept') {
                    const userDeptNorm = currentDeptNormalized;
                    
                    // Match creatorDept first if present
                    if (h.creatorDept) {
                      const creatorDeptNorm = normalizeDept(h.creatorDept);
                      if (userDeptNorm && (userDeptNorm === creatorDeptNorm || (userDeptNorm === 'trung tam' && creatorDeptNorm.includes('trung tam')))) {
                        return true;
                      }
                      return false;
                    }

                    // Fallback using h.from for thuhoi and dc, or h.user
                    if (h.type === 'thuhoi' || h.type === 'dc') {
                      const fromDeptNorm = normalizeDept(h.from);
                      if (userDeptNorm && userDeptNorm === fromDeptNorm) {
                        return true;
                      }
                    } else if (h.type === 'xuat') {
                      // xuat is created by Kho chính
                      if (userDeptNorm === 'trung tam') {
                        return true;
                      }
                    }
                  }

                  return false;
                })();

                return (
                  <div
                    key={h.id}
                    className={`p-3 border text-left fade-in ${
                      isPending ? 'border-[#D97706] bg-[#FEFBF2]' :
                      isRejected ? 'border-[#C4432A] bg-[#FDF2F0]' :
                      'border-[#1A1A1A] bg-[#F5F2ED]'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="font-mono font-black text-xs text-[#2563EB]">{h.id}</span>
                        <div className="text-[10px] text-[#8C8984] font-mono mt-0.5">{h.date}</div>
                      </div>
                      
                      <div className="text-right">
                        {h.status === 'pending_dept' ? (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-[#D97706] bg-[#FEF3C7] px-1.5 py-0.5 uppercase tracking-wide">
                            Chờ nhận
                          </span>
                        ) : h.status === 'rejected' ? (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-[#C4432A] bg-[#FEE2E2] px-1.5 py-0.5 uppercase tracking-wide">
                            Từ chối
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-[#16A34A] bg-[#D1FAE5] px-1.5 py-0.5 uppercase tracking-wide">
                            Đã nhận
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1 text-[11px] leading-snug">
                      <div className="text-[#1A1A1A]">
                        <span className="text-[#8C8984]">Loại:</span>{' '}
                        <strong className="uppercase text-[10px]">
                          {h.type === 'nhap' ? 'Nhập mua' :
                           h.type === 'thuhoi' ? 'Thu hồi' :
                           h.type === 'xuat' ? 'Xuất khoa' :
                           h.type === 'huy' ? 'Hủy bỏ' : 'Điều chuyển'}
                        </strong>
                      </div>

                      <div className="text-[#1A1A1A]">
                        <span className="text-[#8C8984]">Giao dịch:</span>{' '}
                        <span className="font-medium">
                          {h.from} → {h.to}
                        </span>
                      </div>

                      <div className="text-[#1A1A1A]">
                        <span className="text-[#8C8984]">Người làm:</span> {h.user}
                      </div>

                      <div className="pt-2 border-t border-stone-200 mt-2">
                        <span className="block text-[9px] uppercase tracking-wider font-bold text-[#8C8984] mb-1">
                          Danh sách giao nhận:
                        </span>
                        <div className="space-y-0.5">
                          {(h.items || []).map(i => (
                            <div key={i.ma} className="flex justify-between font-mono text-[10px]">
                              <span>{i.ten}</span>
                              <span className="font-bold">x{i.qty}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {h.note && (
                        <div className="bg-[#EBE8E3] p-1.5 text-[10px] text-stone-600 italic mt-2">
                          Ghi chú: {h.note}
                        </div>
                      )}

                      {/* Approval/rejection buttons for clinical department staff */}
                      {isPending && userCanApprove && (
                        <div className="mt-3 pt-2 border-t border-stone-200 flex gap-1.5">
                          <button
                            onClick={() => onConfirmXuat(h.id)}
                            className="flex-1 py-1 px-2 bg-[#16A34A] hover:bg-[#15803D] text-white text-[10px] font-bold uppercase tracking-wider text-center inline-flex items-center justify-center gap-0.5"
                          >
                            <Check size={10} />
                            Xác Nhận Đã Nhận
                          </button>
                          <button
                            onClick={() => {
                              const reason = prompt('Vui lòng nhập lý do từ chối bàn giao:', 'Phiếu không khớp thông tin thực tế');
                              if (reason !== null) onRejectXuat(h.id, reason || 'Từ chối');
                            }}
                            className="py-1 px-2 bg-[#C4432A] hover:bg-[#A9341F] text-white text-[10px] font-bold uppercase tracking-wider text-center inline-flex items-center justify-center gap-0.5"
                          >
                            <X size={10} />
                            Từ Chối Nhận
                          </button>
                        </div>
                      )}

                      {/* Edit and Delete buttons */}
                      {showEditDelete && (
                        <div className="mt-3 pt-2 border-t border-stone-200 flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTxId(h.id);
                              setTxType(h.type);
                              setTxDate(h.date);
                              setOperator(h.user);
                              setNote(h.note || '');
                              setFromDept(h.from === 'Kho chính' ? '' : h.from);
                              setToDept(h.to === 'Kho chính' ? '' : h.to);
                              setFormLines(h.items.map(it => ({ ma: it.ma, qty: it.qty })));
                              setSupplier((h as any).supplier || '');
                              setSubmitError('');
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="flex-1 py-1 px-2 bg-[#0284C7] hover:bg-[#0369A1] text-white text-[10px] font-bold uppercase tracking-wider text-center inline-flex items-center justify-center gap-0.5 transition-colors"
                          >
                            <Plus size={10} className="rotate-45" />
                            Sửa phiếu
                          </button>
                          {confirmDeleteId === h.id ? (
                            <div className="flex-1 flex gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  if (onDeleteTransaction) {
                                    onDeleteTransaction(h.id);
                                    if (editingTxId === h.id) {
                                      setEditingTxId(null);
                                      setTxType('');
                                      setFromDept('');
                                      setToDept('');
                                      setSupplier('');
                                      setNote('');
                                      setFormLines([{ ma: '', qty: 1 }]);
                                    }
                                  }
                                  setConfirmDeleteId(null);
                                }}
                                className="flex-1 py-1 px-1 bg-[#EF4444] hover:bg-[#DC2626] text-white text-[9px] font-bold uppercase tracking-wider text-center inline-flex items-center justify-center gap-0.5 rounded transition-colors"
                              >
                                <Trash size={10} />
                                Chắc chắn Xóa
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="py-1 px-2 bg-stone-500 hover:bg-stone-600 text-white text-[9px] font-bold uppercase tracking-wider text-center rounded transition-colors"
                              >
                                Hủy
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(h.id)}
                              className="flex-1 py-1 px-2 bg-[#EF4444] hover:bg-[#DC2626] text-white text-[10px] font-bold uppercase tracking-wider text-center inline-flex items-center justify-center gap-0.5 transition-colors"
                            >
                              <Trash size={10} />
                              Xóa phiếu
                            </button>
                          )}
                        </div>
                      )}

                      {/* Informational help text if user is not authorized */}
                      {isPending && !userCanApprove && (
                        <div className="mt-2 text-[10px] text-[#D97706] italic font-medium">
                          ⚠ Đang chờ thủ kho / điều dưỡng khoa "{h.to}" bấm xác nhận bàn bàn giao đồ vải.
                        </div>
                      )}

                      {h.status === 'rejected' && h.rejectReason && (
                        <div className="mt-2 p-1.5 bg-[#FDF2F0] border border-[#FCA5A5] text-[#C4432A] text-[10px]">
                          <strong>Lý do từ chối:</strong> {h.rejectReason}
                        </div>
                      )}

                      {h.confirmedBy && h.status !== 'pending_dept' && (
                        <div className="mt-2 text-[9px] text-[#8C8984] font-mono text-right">
                          Xác nhận bởi {h.confirmedBy} {h.confirmedAt ? `lúc ${new Date(h.confirmedAt).toLocaleDateString('vi-VN')}` : ''}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
