/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { LinenItem, Role, User, Account, HistoryItem, PendingRegistration, DEPARTMENTS, WardDeliverySlip, LaundryDispatch } from './types';
import {
  INITIAL_LINEN_ITEMS,
  INITIAL_DETAIL_ALLOCATIONS,
  INITIAL_ROLES,
  INITIAL_USERS,
  INITIAL_ACCOUNTS,
  INITIAL_WARD_DELIVERY_SLIPS,
  INITIAL_LAUNDRY_DISPATCHES
} from './data';
import AuthGate from './components/AuthGate';
import InventoryScreen from './components/InventoryScreen';
import TransactionScreen from './components/TransactionScreen';
import DeliveryFlow from './components/DeliveryFlow';
import AdminScreens from './components/AdminScreens';
import ReportDashboardScreen from './components/ReportDashboardScreen';
import {
  Hospital,
  LayoutDashboard,
  ArrowLeftRight,
  Shirt,
  Users,
  LogOut,
  FolderSync,
  MapPin,
  ClipboardCheck,
  CheckCircle,
  Truck,
  Menu,
  X,
  ChevronDown,
  ChevronUp,
  Smartphone,
  Package,
  ListFilter,
  FileSpreadsheet,
  TrendingUp
} from 'lucide-react';

const LOCAL_STORAGE_KEY = 'HospLinenPro_test_100_0_state';

interface ToastMsg {
  text: string;
  color: string;
  id: number;
}

export default function App() {
  // --- CORE STATE ENGINE ---
  const [items, setItems] = useState<LinenItem[]>([]);
  const [detailAllocations, setDetailAllocations] = useState<Record<string, [string, number][]>>({});
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [pendingRegs, setPendingRegs] = useState<PendingRegistration[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [wardDeliverySlips, setWardDeliverySlips] = useState<WardDeliverySlip[]>([]);
  const [laundryDispatches, setLaundryDispatches] = useState<LaundryDispatch[]>([]);
  const [temporaryCleanStore, setTemporaryCleanStore] = useState<Record<string, number>>({});
  const [temporaryDirtyStore, setTemporaryDirtyStore] = useState<Record<string, number>>({});
  const [temporaryCompanyDirtyStore, setTemporaryCompanyDirtyStore] = useState<Record<string, number>>({});
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);

  // --- SIMULATED TESTING ROLE STATE ---
  const [simulatedRole, setSimulatedRole] = useState<'ward' | 'orderly' | 'housekeeping' | 'linen' | 'laundry' | 'clean' | 'all' | 'admin'>('all');
  const [simulatedWard, setSimulatedWard] = useState<string>('Khoa Cấp cứu đa khoa');

  // --- UI STATES ---
  const [activeTab, setActiveTab] = useState<'s1' | 's12' | 's-roles' | 's-users' | 's-depts' | 's-report' | 's21-muc1' | 's21-muc2' | 's21-muc3' | 's21-muc4'>('s1');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileTestBarOpen, setMobileTestBarOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [allocationModal, setAllocationModal] = useState<{ ma: string; ten: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isReadOnly, setIsReadOnly] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('linen_readonly');
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    localStorage.setItem('linen_readonly', JSON.stringify(isReadOnly));
  }, [isReadOnly]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      triggerToast('📶 Đã khôi phục kết nối mạng! Bạn có thể nộp và cập nhật dữ liệu bình thường.', '#16A34A');
    };
    const handleOffline = () => {
      setIsOnline(false);
      triggerToast('⚠️ Mất kết nối mạng! Đang chạy ở chế độ ngoại tuyến (Offline). Tất cả dữ liệu nháp của bạn được bảo vệ an toàn tại chỗ.', '#EA580C');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // --- 1) STATE SYNCHRONIZATION AND INITIALIZATION ---
  useEffect(() => {
    async function initData() {
      try {
        setIsLoading(true);
        const res = await fetch('/api/init');
        if (!res.ok) throw new Error('API initialization failed');
        const data = await res.json();
        
        setItems(data.items);
        setDetailAllocations(data.detailAllocations);
        setUsers(data.users);
        setAccounts(data.accounts);
        setHistory(data.history);
        setWardDeliverySlips(data.wardDeliverySlips);
        setLaundryDispatches(data.laundryDispatches);
        
        // Restore session from JWT
        const token = localStorage.getItem('token');
        if (token) {
          try {
            const meRes = await fetch('/api/auth/me', {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (meRes.ok) {
              const meData = await meRes.json();
              setCurrentAccount(meData);
            } else {
              localStorage.removeItem('token');
            }
          } catch (meErr) {
            console.error('Error during auto login verify:', meErr);
          }
        }
        
        let loadedDepts = DEPARTMENTS;
        if (!loadedDepts.includes("Khách")) {
          loadedDepts = [...loadedDepts, "Khách", "Khách (VIP/Khoa ngoài)"];
        }
        setDepartments(loadedDepts);
        setRoles(INITIAL_ROLES);
        
        // Cache in local storage for offline tolerance
        const payload = {
          DV: data.items,
          DETAIL: data.detailAllocations,
          ROLES: INITIAL_ROLES,
          USERS: data.users,
          ACCOUNTS: data.accounts,
          s12History: data.history,
          wardDeliverySlips: data.wardDeliverySlips,
          laundryDispatches: data.laundryDispatches,
          updatedAt: new Date().toISOString()
        };
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload));
      } catch (e) {
        console.warn('API error, falling back to LocalStorage cache:', e);
        try {
          const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed.DV)) setItems(parsed.DV);
            if (parsed.DETAIL) setDetailAllocations(parsed.DETAIL);
            if (Array.isArray(parsed.USERS)) setUsers(parsed.USERS);
            if (Array.isArray(parsed.ACCOUNTS)) setAccounts(parsed.ACCOUNTS);
            if (Array.isArray(parsed.s12History)) setHistory(parsed.s12History);
            if (Array.isArray(parsed.wardDeliverySlips)) setWardDeliverySlips(parsed.wardDeliverySlips);
            if (Array.isArray(parsed.laundryDispatches)) setLaundryDispatches(parsed.laundryDispatches);
          } else {
            setItems(INITIAL_LINEN_ITEMS);
            setDetailAllocations(INITIAL_DETAIL_ALLOCATIONS);
            setUsers(INITIAL_USERS);
            setAccounts(INITIAL_ACCOUNTS);
            setWardDeliverySlips(INITIAL_WARD_DELIVERY_SLIPS);
            setLaundryDispatches(INITIAL_LAUNDRY_DISPATCHES);
          }
          setRoles(INITIAL_ROLES);
          setDepartments(DEPARTMENTS);
        } catch (localError) {
          console.error('LocalStorage fallback error:', localError);
        }
      } finally {
        setIsLoading(false);
      }
    }
    initData();
  }, []);

  useEffect(() => {
    setRoles(prevRoles => {
      let changed = false;
      const nextRoles = prevRoles.map(r => {
        const nameLower = (r.name || '').toLowerCase();
        let changedRole = false;
        let newPerms = { ...r.perms };
        if (newPerms.dovai === undefined) {
          newPerms.dovai = (r.name !== 'Kế toán' && r.name !== 'Xem báo cáo');
          changedRole = true;
        }
        if (nameLower.includes('hộ lý')) {
          if (r.desc === 'Thu hồi & luân chuyển đồ vải khoa') {
            changedRole = true;
            return {
              ...r,
              desc: 'Chỉ giao nhận đồ vải khoa (không xuất nhập kho)',
              perms: newPerms
            };
          }
        } else if (nameLower.includes('điều dưỡng')) {
          const isLockedV1 = localStorage.getItem('dovai_locked_v1');
          if (!isLockedV1 && newPerms.dovai !== false) {
            newPerms.dovai = false;
            changedRole = true;
            localStorage.setItem('dovai_locked_v1', 'true');
          }
          if (newPerms.thuhoi === undefined || newPerms.dc === undefined) {
            if (newPerms.thuhoi === undefined) newPerms.thuhoi = true;
            if (newPerms.dc === undefined) newPerms.dc = true;
            changedRole = true;
          }
        }
        if (changedRole) {
          changed = true;
          return { ...r, perms: newPerms };
        }
        return r;
      });
      if (!nextRoles.some(r => (r.name || '').toLowerCase().includes('hộ lý'))) {
        changed = true;
        const insertIdx = nextRoles.length > 0 ? nextRoles.length - 1 : 0;
        nextRoles.splice(insertIdx, 0, {
          name: 'Hộ lý',
          color: '#eab308',
          desc: 'Chỉ giao nhận đồ vải khoa (không xuất nhập kho)',
          perms: { nhap: false, thuhoi: false, xuat: false, huy: false, dc: false, dovai: true }
        });
      }
      if (changed) {
        setTimeout(() => {
          const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
          if (raw) {
            try {
              const parsed = JSON.parse(raw);
              parsed.ROLES = nextRoles;
              localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(parsed));
            } catch (e) {}
          }
        }, 0);
        return nextRoles;
      }
      return prevRoles;
    });
  }, []);

  const saveAllStates = (
    newItems: LinenItem[],
    newDetail: Record<string, [string, number][]>,
    newRoles: Role[],
    newUsers: User[],
    newAccounts: Account[],
    newHistory: HistoryItem[],
    newPending: PendingRegistration[],
    newDepts: string[] = departments,
    newWardSlips: WardDeliverySlip[] = wardDeliverySlips,
    newLaundryDispatches: LaundryDispatch[] = laundryDispatches,
    newTempStore: Record<string, number> = temporaryCleanStore,
    newTempDirtyStore: Record<string, number> = temporaryDirtyStore,
    newTempCompanyDirtyStore: Record<string, number> = temporaryCompanyDirtyStore
  ) => {
    if (isReadOnly) {
      triggerToast('🔒 Chế độ Chỉ xem đang BẬT. Không thể thực hiện thao tác thay đổi dữ liệu!', '#EF4444');
      return;
    }
    // Re-calculate kp (allocated totals) for each item to prevent discrepancies
    const syncedItems = newItems.map(item => {
      const kpSum = (newDetail[item.ma] || []).reduce((sum, r) => sum + (r[1] || 0), 0);
      return { ...item, kp: kpSum };
    });

    setItems(syncedItems);
    setDetailAllocations(newDetail);
    setRoles(newRoles);
    setUsers(newUsers);
    setAccounts(newAccounts);
    setHistory(newHistory);
    setPendingRegs(newPending);
    setDepartments(newDepts);
    setWardDeliverySlips(newWardSlips);
    setLaundryDispatches(newLaundryDispatches);
    setTemporaryCleanStore(newTempStore);
    setTemporaryDirtyStore(newTempDirtyStore);
    setTemporaryCompanyDirtyStore(newTempCompanyDirtyStore);

    const payload = {
      DV: syncedItems,
      DETAIL: newDetail,
      ROLES: newRoles,
      USERS: newUsers,
      ACCOUNTS: newAccounts,
      s12History: newHistory,
      PENDING_REGISTRATIONS: newPending,
      DEPARTMENTS: newDepts,
      wardDeliverySlips: newWardSlips,
      laundryDispatches: newLaundryDispatches,
      temporaryCleanStore: newTempStore,
      temporaryDirtyStore: newTempDirtyStore,
      temporaryCompanyDirtyStore: newTempCompanyDirtyStore,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload));

    // Async sync state to PostgreSQL
    fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: syncedItems,
        detailAllocations: newDetail,
        roles: newRoles,
        users: newUsers,
        accounts: newAccounts,
        history: newHistory,
        wardDeliverySlips: newWardSlips,
        laundryDispatches: newLaundryDispatches
      })
    })
    .then(async (res) => {
      if (!res.ok) {
        const text = await res.text();
        console.error('Failed to sync to postgres:', text);
      }
    })
    .catch((err) => {
      console.error('Error during postgres sync:', err);
    });
  };

  const handleUpdateDepartments = (
    newDepts: string[], 
    renameMapping?: { oldName: string; newName: string },
    deletedName?: string
  ) => {
    let nextUsers = [...users];
    let nextDetail = { ...detailAllocations };

    if (renameMapping) {
      const { oldName, newName } = renameMapping;
      
      // Update users' department names
      nextUsers = users.map(u => {
        if (u.dept === oldName) {
          return { ...u, dept: newName };
        }
        return u;
      });

      // Update detail allocations
      Object.keys(nextDetail).forEach(ma => {
        nextDetail[ma] = nextDetail[ma].map(([dName, qty]) => {
          if (dName === oldName) {
            return [newName, qty] as [string, number];
          }
          return [dName, qty] as [string, number];
        });
      });
    }

    if (deletedName) {
      // Set deleted department users to empty string (Unassigned)
      nextUsers = users.map(u => {
        if (u.dept === deletedName) {
          return { ...u, dept: '' };
        }
        return u;
      });

      // Remove allocations for the deleted department
      Object.keys(nextDetail).forEach(ma => {
        nextDetail[ma] = nextDetail[ma].filter(([dName]) => dName !== deletedName);
      });
    }

    saveAllStates(items, nextDetail, roles, nextUsers, accounts, history, pendingRegs, newDepts);
    triggerToast('Đã đồng bộ cập nhật danh sách khoa phòng lâm sàng', '#16A34A');
  };

  // --- 2) UTILITIES & EVENT HANDLERS ---
  const triggerToast = (text: string, color: string = '#16A34A') => {
    const id = Date.now();
    setToasts(prev => [...prev, { text, color, id }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  };

  const handleLogin = (acc: Account) => {
    setCurrentAccount(acc);
    triggerToast(`Đăng nhập thành công làm: ${acc.name}`, '#2563EB');
  };

  const handleLogout = () => {
    setCurrentAccount(null);
    localStorage.removeItem('token');
    triggerToast('Đã đăng xuất tài khoản.', '#1A1A1A');
  };

  const handleRegisterSubmit = (reg: PendingRegistration) => {
    const nextPending = [...pendingRegs, reg];
    saveAllStates(items, detailAllocations, roles, users, accounts, history, nextPending);
  };

  // --- 3) INVENTORY OPERATIONS ---
  const handleAddItem = (newItem: LinenItem) => {
    const nextItems = [...items, newItem];
    const nextDetail = { ...detailAllocations, [newItem.ma]: [] };
    saveAllStates(nextItems, nextDetail, roles, users, accounts, history, pendingRegs);
    triggerToast(`Thêm đồ vải thành công: ${newItem.ten}`);
  };

  const handleEditItem = (origMa: string, updatedItem: LinenItem) => {
    const nextItems = items.map(i => (i.ma === origMa ? updatedItem : i));
    const nextDetail = { ...detailAllocations };
    if (updatedItem.ma !== origMa) {
      nextDetail[updatedItem.ma] = nextDetail[origMa] || [];
      delete nextDetail[origMa];
    }
    saveAllStates(nextItems, nextDetail, roles, users, accounts, history, pendingRegs);
    triggerToast(`Cập nhật thông tin đồ vải thành công: ${updatedItem.ten}`);
  };

  const handleDeleteItem = (ma: string) => {
    const targetItem = items.find(i => i.ma === ma);
    const nextItems = items.filter(i => i.ma !== ma);
    const nextDetail = { ...detailAllocations };
    delete nextDetail[ma];
    saveAllStates(nextItems, nextDetail, roles, users, accounts, history, pendingRegs);
    triggerToast(`Đã xóa mặt hàng: ${targetItem?.ten || ma}`, '#C4432A');
  };

  // Revert changes in stock caused by a transaction
  const revertTransactionStock = (h: HistoryItem, currentItems: LinenItem[], currentDetails: Record<string, [string, number][]>) => {
    const nextItems = currentItems.map(i => ({ ...i }));
    const nextDetail = { ...currentDetails };

    // Only revert if stock movement was already applied
    if (h.movementApplied) {
      h.items.forEach(({ ma, qty }) => {
        const idx = nextItems.findIndex(i => i.ma === ma);
        if (idx < 0) return;

        if (h.type === 'nhap') {
          nextItems[idx].kc = Math.max(0, nextItems[idx].kc - qty);
        } else if (h.type === 'huy') {
          nextItems[idx].kc += qty;
        } else if (h.type === 'thuhoi') {
          // Revert thuhoi: Deduct from Main store, add back to department
          nextItems[idx].kc = Math.max(0, nextItems[idx].kc - qty);
          const depts = nextDetail[ma] ? nextDetail[ma].map(d => [...d] as [string, number]) : [];
          const dIdx = depts.findIndex(d => d[0] === h.from);
          if (dIdx >= 0) {
            depts[dIdx][1] += qty;
          } else {
            depts.push([h.from, qty]);
          }
          nextDetail[ma] = depts.filter(d => d[1] > 0);
        } else if (h.type === 'dc') {
          // Revert dc: deduct from toDept, add back to fromDept
          const depts = nextDetail[ma] ? nextDetail[ma].map(d => [...d] as [string, number]) : [];
          const toIdx = depts.findIndex(d => d[0] === h.to);
          if (toIdx >= 0) {
            depts[toIdx][1] = Math.max(0, depts[toIdx][1] - qty);
          }
          const fromIdx = depts.findIndex(d => d[0] === h.from);
          if (fromIdx >= 0) {
            depts[fromIdx][1] += qty;
          } else {
            depts.push([h.from, qty]);
          }
          nextDetail[ma] = depts.filter(d => d[1] > 0);
        } else if (h.type === 'xuat') {
          // Revert xuat: add back to Main store, deduct from department
          nextItems[idx].kc += qty;
          const depts = nextDetail[ma] ? nextDetail[ma].map(d => [...d] as [string, number]) : [];
          const dIdx = depts.findIndex(d => d[0] === h.to);
          if (dIdx >= 0) {
            depts[dIdx][1] = Math.max(0, depts[dIdx][1] - qty);
          }
          nextDetail[ma] = depts.filter(d => d[1] > 0);
        }
      });
    }

    return { nextItems, nextDetail };
  };

  const handleDeleteTransaction = (id: string) => {
    const targetTx = history.find(h => h.id === id);
    if (!targetTx) return;

    const { nextItems, nextDetail } = revertTransactionStock(targetTx, items, detailAllocations);
    const nextHistory = history.filter(h => h.id !== id);

    saveAllStates(nextItems, nextDetail, roles, users, accounts, nextHistory, pendingRegs);
    triggerToast(`Đã xóa phiếu ${id} thành công và khôi phục tồn kho.`, '#C4432A');
  };

  const handleUpdateTransaction = (id: string, tx: {
    type: 'nhap' | 'thuhoi' | 'xuat' | 'huy' | 'dc';
    date: string;
    user: string;
    note: string;
    fromDept: string;
    toDept: string;
    items: Array<{ ma: string; qty: number }>;
    supplier?: string;
  }) => {
    const origTx = history.find(h => h.id === id);
    if (!origTx) return;

    const wasConfirmed = origTx.status === 'confirmed';
    const isPendingType = tx.type === 'xuat' || tx.type === 'dc' || tx.type === 'thuhoi';
    const isPending = isPendingType && !wasConfirmed;

    // 1. Revert original stock
    const { nextItems, nextDetail } = revertTransactionStock(origTx, items, detailAllocations);

    // 2. Apply new stock changes
    tx.items.forEach(({ ma, qty }) => {
      const idx = nextItems.findIndex(i => i.ma === ma);
      if (idx < 0) return;

      if (tx.type === 'nhap') {
        nextItems[idx].kc += qty;
      } else if (tx.type === 'huy') {
        nextItems[idx].kc = Math.max(0, nextItems[idx].kc - qty);
      } else if (tx.type === 'thuhoi') {
        // Only if already confirmed
        if (wasConfirmed) {
          const depts = nextDetail[ma] ? nextDetail[ma].map(d => [...d] as [string, number]) : [];
          const dIdx = depts.findIndex(d => d[0] === tx.fromDept);
          if (dIdx >= 0) {
            depts[dIdx][1] = Math.max(0, depts[dIdx][1] - qty);
          }
          nextDetail[ma] = depts.filter(d => d[1] > 0);
          nextItems[idx].kc += qty;
        }
      } else if (tx.type === 'dc') {
        // Only if already confirmed
        if (wasConfirmed) {
          const depts = nextDetail[ma] ? nextDetail[ma].map(d => [...d] as [string, number]) : [];
          const sourceIdx = depts.findIndex(d => d[0] === tx.fromDept);
          if (sourceIdx >= 0) {
            depts[sourceIdx][1] = Math.max(0, depts[sourceIdx][1] - qty);
          }
          const targetIdx = depts.findIndex(d => d[0] === tx.toDept);
          if (targetIdx >= 0) {
            depts[targetIdx][1] += qty;
          } else {
            depts.push([tx.toDept, qty]);
          }
          nextDetail[ma] = depts.filter(d => d[1] > 0);
        }
      }
    });

    // If 'xuat' and was already confirmed, apply stock deduct from main, add to dept
    if (tx.type === 'xuat' && wasConfirmed) {
      tx.items.forEach(({ ma, qty }) => {
        const itemIdx = nextItems.findIndex(i => i.ma === ma);
        if (itemIdx >= 0) {
          nextItems[itemIdx].kc = Math.max(0, nextItems[itemIdx].kc - qty);
        }

        const depts = nextDetail[ma] ? nextDetail[ma].map(d => [...d] as [string, number]) : [];
        const dIdx = depts.findIndex(d => d[0] === tx.toDept);
        if (dIdx >= 0) {
          depts[dIdx][1] += qty;
        } else {
          depts.push([tx.toDept, qty]);
        }
        nextDetail[ma] = depts.filter(d => d[1] > 0);
      });
    }

    const detailedItems = tx.items.map(it => {
      const orig = items.find(i => i.ma === it.ma);
      return { ma: it.ma, ten: orig?.ten || it.ma, qty: it.qty };
    });

    const updatedHistoryItem: HistoryItem = {
      ...origTx,
      type: tx.type,
      date: tx.date,
      user: tx.user,
      note: tx.note,
      from: tx.type === 'nhap' || tx.type === 'huy' || tx.type === 'xuat' ? 'Kho chính' : tx.fromDept,
      to: tx.type === 'nhap' || tx.type === 'huy' || tx.type === 'thuhoi' ? 'Kho chính' : tx.toDept,
      items: detailedItems,
      status: isPending ? 'pending_dept' : 'confirmed',
      movementApplied: isPending ? false : (isPendingType ? wasConfirmed : true),
      supplier: tx.supplier,
      creatorDept: origTx.creatorDept || currentWardName
    };

    const nextHistory = history.map(h => (h.id === id ? updatedHistoryItem : h));
    saveAllStates(nextItems, nextDetail, roles, users, accounts, nextHistory, pendingRegs);
    triggerToast(`Đã chỉnh sửa phiếu ${id} thành công.`);
  };

  // --- 4) TRANSACTIONS HANDLERS ---
  const handleSubmitTransaction = (tx: {
    type: 'nhap' | 'thuhoi' | 'xuat' | 'huy' | 'dc';
    date: string;
    user: string;
    note: string;
    fromDept: string;
    toDept: string;
    items: Array<{ ma: string; qty: number }>;
    supplier?: string;
  }) => {
    if (isHousekeepingUser) {
      triggerToast('Tài khoản Hộ lý không có quyền tạo phiếu xuất nhập kho đồ vải.', 'error');
      return;
    }

    const nextItems = [...items];
    const nextDetail = { ...detailAllocations };

    // Apply stock balances changes
    tx.items.forEach(({ ma, qty }) => {
      const idx = nextItems.findIndex(i => i.ma === ma);
      if (idx < 0) return;

      if (tx.type === 'nhap') {
        nextItems[idx].kc += qty;
      } else if (tx.type === 'huy') {
        nextItems[idx].kc = Math.max(0, nextItems[idx].kc - qty);
      }
      // Note: "xuat", "dc" and "thuhoi" stay pending_dept.
      // Their stock changes are ONLY applied when the receiving department/location explicitly confirms receipt!
    });

    // Save transaction slip to history ledger
    const prefix = tx.type === 'nhap' ? 'NM' : tx.type === 'thuhoi' ? 'TH' : tx.type === 'xuat' ? 'XK' : tx.type === 'huy' ? 'XH' : 'DC';
    const nextId = `${prefix}-${String(history.length + 1).padStart(5, '0')}`;
    
    const detailedItems = tx.items.map(it => {
      const orig = items.find(i => i.ma === it.ma);
      return { ma: it.ma, ten: orig?.ten || it.ma, qty: it.qty };
    });

    const isPending = tx.type === 'xuat' || tx.type === 'dc' || tx.type === 'thuhoi';

    const newHistoryItem: HistoryItem = {
      id: nextId,
      type: tx.type,
      date: tx.date,
      user: tx.user,
      note: tx.note,
      from: tx.fromDept,
      to: tx.toDept,
      items: detailedItems,
      status: isPending ? 'pending_dept' : 'confirmed',
      movementApplied: !isPending,
      creatorDept: currentWardName
    };

    const nextHistory = [newHistoryItem, ...history];
    saveAllStates(nextItems, nextDetail, roles, users, accounts, nextHistory, pendingRegs);

    if (isPending) {
      if (tx.type === 'xuat') {
        triggerToast(`Phiếu xuất ${nextId} đang chờ khoa ${tx.toDept} nhận xác nhận.`, '#D97706');
      } else if (tx.type === 'dc') {
        triggerToast(`Phiếu điều chuyển ${nextId} đang chờ khoa ${tx.toDept} nhận xác nhận.`, '#D97706');
      } else {
        triggerToast(`Phiếu thu hồi ${nextId} đang chờ Kho trung tâm nhận xác nhận.`, '#D97706');
      }
    } else {
      triggerToast(`Giao dịch ${nextId} thành công — Đã cập nhật kho.`);
    }
  };

  // Approve pending Xuất Kho & Điều Chuyển & Thu hồi
  const handleConfirmXuat = (id: string) => {
    const nextHistory = history.map(h => {
      if (h.id === id && (h.type === 'xuat' || h.type === 'dc' || h.type === 'thuhoi') && h.status === 'pending_dept' && !h.movementApplied) {
        // Apply changes now
        const nextItems = [...items];
        const nextDetail = { ...detailAllocations };

        h.items.forEach(({ ma, qty }) => {
          if (h.type === 'xuat') {
            // Deduct Main store, add to Department allocation
            const itemIdx = nextItems.findIndex(i => i.ma === ma);
            if (itemIdx >= 0) {
              nextItems[itemIdx].kc = Math.max(0, nextItems[itemIdx].kc - qty);
            }

            const depts = nextDetail[ma] || [];
            const dIdx = depts.findIndex(d => d[0] === h.to);
            if (dIdx >= 0) {
              depts[dIdx][1] += qty;
            } else {
              depts.push([h.to, qty]);
            }
            nextDetail[ma] = depts.filter(d => d[1] > 0);
          } else if (h.type === 'dc') {
            // Move from department A (h.from) to department B (h.to)
            const depts = nextDetail[ma] || [];
            const sourceIdx = depts.findIndex(d => d[0] === h.from);
            if (sourceIdx >= 0) {
              depts[sourceIdx][1] = Math.max(0, depts[sourceIdx][1] - qty);
            }
            const targetIdx = depts.findIndex(d => d[0] === h.to);
            if (targetIdx >= 0) {
              depts[targetIdx][1] += qty;
            } else {
              depts.push([h.to, qty]);
            }
            nextDetail[ma] = depts.filter(d => d[1] > 0);
          } else if (h.type === 'thuhoi') {
            // Deduct from department allocation, add to Main store
            const itemIdx = nextItems.findIndex(i => i.ma === ma);
            if (itemIdx >= 0) {
              nextItems[itemIdx].kc += qty;
            }

            const depts = nextDetail[ma] || [];
            const dIdx = depts.findIndex(d => d[0] === h.from);
            if (dIdx >= 0) {
              depts[dIdx][1] = Math.max(0, depts[dIdx][1] - qty);
            }
            nextDetail[ma] = depts.filter(d => d[1] > 0);
          }
        });

        setTimeout(() => {
          saveAllStates(nextItems, nextDetail, roles, users, accounts, nextHistory, pendingRegs);
        }, 0);

        return {
          ...h,
          status: 'confirmed' as const,
          confirmedBy: currentAccount?.name || 'Thủ kho / Điều dưỡng',
          confirmedAt: new Date().toISOString(),
          movementApplied: true
        };
      }
      return h;
    });

    setHistory(nextHistory);
    triggerToast(`Đã nhận bàn giao phiếu ${id} — Tồn kho đã cập nhật.`);
  };

  // Reject pending Xuất Kho
  const handleRejectXuat = (id: string, reason: string) => {
    const nextHistory = history.map(h => {
      if (h.id === id) {
        return {
          ...h,
          status: 'rejected' as const,
          rejectReason: reason,
          confirmedBy: currentAccount?.name || 'Điều dưỡng khoa',
          confirmedAt: new Date().toISOString()
        };
      }
      return h;
    });
    setHistory(nextHistory);
    saveAllStates(items, detailAllocations, roles, users, accounts, nextHistory, pendingRegs);
    triggerToast(`Đã từ chối phiếu ${id}: ${reason}`, '#C4432A');
  };

  // --- 5) DELIVERY CYCLE WRAPPER ---
  const handleCompleteDeliveryCycle = (recovered: Array<{ ma: string; qty: number }>) => {
    // Add returned clean linen to Main store
    const nextItems = items.map(item => {
      const returnedRec = recovered.find(r => r.ma === item.ma);
      if (returnedRec) {
        return { ...item, kc: item.kc + returnedRec.qty };
      }
      return item;
    });

    saveAllStates(nextItems, detailAllocations, roles, users, accounts, history, pendingRegs);
    setActiveTab('s1'); // Back to main catalog
    triggerToast('Hoàn thành bàn giao giặt ủi — Đã nhập kho đồ sạch.');
  };

  // --- 6) BACKUPS / RECOVERY TRIGGERS ---
  const handleImportBackup = (file: File) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const payload = JSON.parse(e.target?.result as string);
        if (Array.isArray(payload.DV)) {
          saveAllStates(
            payload.DV,
            payload.DETAIL || {},
            Array.isArray(payload.ROLES) ? payload.ROLES.map((r: any) => ({
              ...r,
              perms: {
                ...r.perms,
                dovai: r.perms?.dovai !== undefined ? r.perms.dovai : (r.name !== 'Kế toán' && r.name !== 'Xem báo cáo')
              }
            })) : INITIAL_ROLES,
            Array.isArray(payload.USERS) ? payload.USERS : INITIAL_USERS,
            Array.isArray(payload.ACCOUNTS) ? payload.ACCOUNTS : INITIAL_ACCOUNTS,
            Array.isArray(payload.s12History) ? payload.s12History : [],
            Array.isArray(payload.PENDING_REGISTRATIONS) ? payload.PENDING_REGISTRATIONS : [],
            Array.isArray(payload.DEPARTMENTS) ? payload.DEPARTMENTS : departments,
            Array.isArray(payload.wardDeliverySlips) ? payload.wardDeliverySlips : [],
            Array.isArray(payload.laundryDispatches) ? payload.laundryDispatches : [],
            payload.temporaryCleanStore || {},
            payload.temporaryDirtyStore || {},
            payload.temporaryCompanyDirtyStore || {}
          );
          triggerToast('Khôi phục dữ liệu từ JSON thành công.');
        } else {
          alert('Tệp backup JSON không đúng cấu hình.');
        }
      } catch (err) {
        alert('Có lỗi xảy ra khi xử lý tệp tin.');
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleExportBackup = () => {
    const payload = {
      DV: items,
      DETAIL: detailAllocations,
      ROLES: roles,
      USERS: users,
      ACCOUNTS: accounts,
      s12History: history,
      PENDING_REGISTRATIONS: pendingRegs,
      DEPARTMENTS: departments,
      wardDeliverySlips: wardDeliverySlips,
      laundryDispatches: laundryDispatches,
      temporaryCleanStore: temporaryCleanStore,
      temporaryDirtyStore: temporaryDirtyStore,
      temporaryCompanyDirtyStore: temporaryCompanyDirtyStore,
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `HospLinenPro_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    triggerToast('Đã xuất file lưu trữ sao lưu.');
  };

  const handleInitTestStock = () => {
    // Reset to official initial linen items & details, and clear history/pending & all delivery slips and temp stock
    saveAllStates(INITIAL_LINEN_ITEMS, INITIAL_DETAIL_ALLOCATIONS, roles, users, accounts, [], [], departments, [], [], {}, {}, {});
    triggerToast('✓ Đã khôi phục toàn bộ hệ thống về số liệu tồn kho chính thức, xóa lịch sử & phiếu giao nhận!', '#16A34A');
  };

  const handleGenerateReportTestData = () => {
    // Generate realistic historical data for beautiful visual analytics
    const depts = ["NICU", "Phòng sanh", "Cấp cứu đa khoa", "Khoa Gây mê hồi sức", "Nội trú sản T1", "Nội trú nhi"];
    const itemsList = [
      { ma: "DV030", ten: "DRAP TRẮNG S", group: "Drap / săng / sheet" },
      { ma: "DV034", ten: "ÁO GỐI TRẮNG", group: "Quần áo / trang phục" },
      { ma: "DV033", ten: "RUỘT GỐI", group: "Mền / gối" },
      { ma: "DV001", ten: "PTV PHÒNG MỔ", group: "Quần áo / trang phục" },
      { ma: "DV003", ten: "PTV PHÒNG SANH", group: "Quần áo / trang phục" },
      { ma: "DV040", ten: "KHĂN KEM LỚN", group: "Khăn" },
      { ma: "DV048", ten: "KHĂN LAU TAY IVF", group: "Khăn" }
    ];

    const testSlips: WardDeliverySlip[] = [];
    const testHistory: HistoryItem[] = [];

    const months = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
    let slipCounter = 100;

    months.forEach((m, mIdx) => {
      // 3 to 5 slips per month for high fidelity chart lines
      const slipsCount = 3 + Math.floor(Math.random() * 3);
      for (let i = 0; i < slipsCount; i++) {
        const day = String(3 + i * 6).padStart(2, '0');
        const dept = depts[(mIdx + i) % depts.length];
        const slipId = `PGN-${day}${m}26${String(slipCounter++).slice(-2)}`;
        const dateStr = `2026-${m}-${day}T09:30:00`;
        
        const slipItems: any[] = [];
        const numItems = 2 + Math.floor(Math.random() * 3);
        const shuffledItems = [...itemsList].sort(() => 0.5 - Math.random());
        
        for (let j = 0; j < numItems; j++) {
          const item = shuffledItems[j];
          const qty = 15 + Math.floor(Math.random() * 40);
          
          const isLoss = Math.random() > 0.90;
          const isRewash = Math.random() > 0.92;
          const cleanQty = isLoss ? qty - 1 : qty;
          const rewashQty = isRewash ? 1 : 0;

          slipItems.push({
            ma: item.ma,
            ten: item.ten,
            group: item.group,
            qty,
            isInfectious: Math.random() > 0.85,
            isVerifiedDirty: true,
            verifiedDirtyQty: qty,
            isLaundryReceived: true,
            laundryReceivedQty: qty,
            cleanReturnedQty: cleanQty,
            isCleanReturnedVerified: true,
            isHospitalCleanVerified: true,
            hospitalCleanQty: cleanQty,
            rewashQty: rewashQty,
            lossQty: isLoss ? 1 : 0
          });
        }

        testSlips.push({
          id: slipId,
          dept,
          createdAt: dateStr,
          createdBy: "Hệ thống giả lập",
          status: "confirmed",
          confirmedAt: `2026-${m}-${day}T16:00:00`,
          confirmedBy: "Nguyễn Văn An",
          items: slipItems
        });
      }

      // Add a Discard/Loss/Huy transaction in general history to show the "discard/rách hỏng" trend
      const cancelDay = String(20).padStart(2, '0');
      testHistory.push({
        id: `XH-2026-${m}-${cancelDay}`,
        type: 'huy',
        date: `2026-${m}-${cancelDay}T11:00:00`,
        user: "Quản trị viên",
        note: `Hủy rách hao mòn định kỳ tháng ${m}/2026`,
        from: "Kho trung tâm",
        to: "Kho trung tâm",
        items: [
          { ma: "DV030", ten: "DRAP TRẮNG S", qty: 2 + Math.floor(Math.random() * 4) },
          { ma: "DV034", ten: "ÁO GỐI TRẮNG", qty: 1 + Math.floor(Math.random() * 3) }
        ],
        status: 'confirmed',
        movementApplied: true
      });
    });

    const nextSlips = [...testSlips, ...wardDeliverySlips];
    const nextHistory = [...testHistory, ...history];

    saveAllStates(items, detailAllocations, roles, users, accounts, nextHistory, pendingRegs, departments, nextSlips, laundryDispatches, temporaryCleanStore, temporaryDirtyStore, temporaryCompanyDirtyStore);
    triggerToast("⚡ Đã nạp 50+ phiếu giao nhận và dữ liệu hủy rách lâm sàng cho 12 tháng năm 2026 thành công!", "#10B981");
  };

  const handleClearReportTestData = () => {
    const nextSlips = wardDeliverySlips.filter(s => s.createdBy !== "Hệ thống giả lập");
    const nextHistory = history.filter(h => !(h.id.startsWith("XH-2026-") && h.note?.includes("Hủy rách hao mòn định kỳ")));

    saveAllStates(items, detailAllocations, roles, users, accounts, nextHistory, pendingRegs, departments, nextSlips, laundryDispatches, temporaryCleanStore, temporaryDirtyStore, temporaryCompanyDirtyStore);
    triggerToast("🧹 Đã xóa sạch dữ liệu thử nghiệm và khôi phục trạng thái báo cáo thực tế thành công!", "#EF4444");
  };

  const hasSimulatedData = useMemo(() => {
    return wardDeliverySlips.some(s => s.createdBy === "Hệ thống giả lập");
  }, [wardDeliverySlips]);

  // --- 7) USER POSITION AND ROLES MATRICES ---
  const effectiveAccount = useMemo(() => {
    if (!currentAccount) return null;
    if (simulatedRole === 'all' || simulatedRole === 'admin') return currentAccount;
    if (simulatedRole === 'ward') {
      return { ...currentAccount, name: `Điều dưỡng (${simulatedWard || departments[0] || 'Khoa Cấp cứu đa khoa'})`, username: 'sim.dd', isAdmin: false };
    }
    if (simulatedRole === 'orderly' || simulatedRole === 'housekeeping') {
      return { ...currentAccount, name: `Hộ lý (${simulatedWard || departments[0] || 'Khoa Cấp cứu đa khoa'})`, username: 'sim.hl', isAdmin: false };
    }
    if (simulatedRole === 'linen') {
      return { ...currentAccount, name: 'Trưởng kho đồ vải (Kho trung tâm)', username: 'sim.dovai', isAdmin: false };
    }
    if (simulatedRole === 'clean') {
      return { ...currentAccount, name: 'Nhân viên đồ vải (Kho trung tâm)', username: 'sim.khosach', isAdmin: false };
    }
    if (simulatedRole === 'laundry') {
      return { ...currentAccount, name: 'Nhân viên Xưởng giặt Cty', username: 'sim.laundry', isAdmin: false };
    }
    return currentAccount;
  }, [currentAccount, simulatedRole, simulatedWard, departments]);

  const currentRoleName = useMemo(() => {
    if (simulatedRole === 'ward') return 'Điều dưỡng';
    if (simulatedRole === 'orderly' || simulatedRole === 'housekeeping') return 'Hộ lý';
    if (simulatedRole === 'linen') return 'Trưởng kho đồ vải';
    if (simulatedRole === 'clean') return 'Nhân viên đồ vải';
    if (simulatedRole === 'laundry') return 'Công ty giặt';
    if (!currentAccount) return '';
    if (currentAccount.isAdmin) return 'Quản trị viên';
    const u = users[currentAccount.userIdx] || users.find(x => x.email === currentAccount.email);
    return u ? roles[u.role]?.name : 'Nhân viên';
  }, [currentAccount, users, roles, simulatedRole]);

  const currentWardName = useMemo(() => {
    if (simulatedRole === 'ward' || simulatedRole === 'orderly' || simulatedRole === 'housekeeping') {
      return simulatedWard || departments[0] || 'Khoa Cấp cứu đa khoa';
    }
    if (simulatedRole === 'linen' || simulatedRole === 'clean') return 'Kho trung tâm';
    if (simulatedRole === 'laundry') return 'Xưởng giặt Cty';
    if (!currentAccount) return '';
    if (currentAccount.isAdmin) return 'Tất cả (Không giới hạn)';
    const u = users[currentAccount.userIdx] || users.find(x => x.email === currentAccount.email);
    if (u) return u.dept;

    // Fallback for hardcoded or assigned ward focus
    const username = currentAccount.username;
    if (username === 'mai.dd') return 'Khoa Cấp cứu đa khoa';
    if (username === 'hoa.dd') return 'NICU';
    if (username === 'ngoc.dd') return 'Phòng sanh';
    if (username === 'tai.hl') return 'Khoa Cấp cứu đa khoa';
    if (username === 'lan.hl') return 'Gây mê hồi sức';
    if (username === 'buongphong') return 'Khách';
    if (username === 'ctygiat') return 'Xưởng giặt Cty';
    return 'Tất cả';
  }, [currentAccount, users, simulatedRole, simulatedWard, departments]);

  const canSeeLinenDelivery = useMemo(() => {
    if (simulatedRole === 'admin') return true;
    if (simulatedRole !== 'all' && simulatedRole !== 'admin') {
      let keyword = '';
      if (simulatedRole === 'ward') keyword = 'điều dưỡng';
      else if (simulatedRole === 'orderly' || simulatedRole === 'housekeeping') keyword = 'hộ lý';
      else if (simulatedRole === 'linen' || simulatedRole === 'clean') {
        const simRoleObj = roles.find(r => {
          const nameLower = (r.name || '').toLowerCase();
          return nameLower.includes('đồ vải') || nameLower.includes('thủ kho') || nameLower.includes('kho');
        });
        if (simRoleObj && simRoleObj.perms?.dovai !== undefined) {
          return simRoleObj.perms.dovai;
        }
        return false;
      }
      else if (simulatedRole === 'laundry') keyword = 'giặt';

      if (keyword) {
        const simRoleObj = roles.find(r => (r.name || '').toLowerCase().includes(keyword));
        if (simRoleObj && simRoleObj.perms?.dovai !== undefined) {
          return simRoleObj.perms.dovai;
        }
      }
      return false;
    }
    if (currentAccount?.isAdmin) return true;
    if (!currentAccount) return false;
    const u = users[currentAccount.userIdx] || users.find(x => x.email === currentAccount.email);
    if (!u) return false;
    const userRole = roles[u.role];
    return userRole?.perms?.dovai ?? false;
  }, [currentAccount, users, roles, simulatedRole]);

  const isLaundryUser = useMemo(() => {
    if (simulatedRole === 'laundry') return true;
    if (simulatedRole === 'ward' || simulatedRole === 'orderly' || simulatedRole === 'housekeeping' || simulatedRole === 'linen' || simulatedRole === 'clean' || simulatedRole === 'all' || simulatedRole === 'admin') {
      if (simulatedRole !== 'all' && simulatedRole !== 'admin') return false;
    }
    if (!currentAccount || currentAccount.isAdmin) return false;
    const nameLower = (currentAccount.name || '').toLowerCase();
    const userLower = (currentAccount.username || '').toLowerCase();
    const emailLower = (currentAccount.email || '').toLowerCase();
    const roleLower = (currentRoleName || '').toLowerCase();
    const wardLower = (currentWardName || '').toLowerCase();
    return roleLower.includes('giặt') || roleLower.includes('xưởng') || roleLower.includes('công ty') ||
           nameLower.includes('giặt') || nameLower.includes('xưởng') || nameLower.includes('công ty') ||
           userLower.includes('giat') || userLower.includes('xuong') || userLower.includes('cty') ||
           emailLower.includes('giat') || emailLower.includes('xuong') || emailLower.includes('laundry') ||
           wardLower.includes('giặt') || wardLower.includes('xưởng') || wardLower.includes('công ty');
  }, [currentAccount, currentRoleName, currentWardName, simulatedRole]);

  const isWardUser = useMemo(() => {
    if (simulatedRole === 'ward' || simulatedRole === 'orderly' || simulatedRole === 'housekeeping') return true;
    if (simulatedRole === 'laundry' || simulatedRole === 'linen' || simulatedRole === 'clean') return false;
    if (!currentAccount || currentAccount.isAdmin || isLaundryUser) return false;
    if (currentRoleName.includes('Thủ kho') || currentRoleName.includes('đồ vải') || currentRoleName.includes('Quản trị')) return false;
    
    const nameLower = (currentAccount.name || '').toLowerCase();
    const userLower = (currentAccount.username || '').toLowerCase();
    const emailLower = (currentAccount.email || '').toLowerCase();
    const roleLower = (currentRoleName || '').toLowerCase();
    
    if (roleLower.includes('điều dưỡng') || roleLower.includes('hộ lý') || roleLower.includes('buồng phòng') || roleLower.includes('khoa') ||
        nameLower.includes('điều dưỡng') || nameLower.includes('hộ lý') || nameLower.includes('buồng') ||
        userLower.includes('.hl') || userLower.includes('.dd') || userLower.includes('buongphong') || userLower.includes('holy') || userLower.includes('dieuduong') ||
        emailLower.includes('.hl') || emailLower.includes('.dd') || emailLower.includes('buongphong') || emailLower.includes('holy') || emailLower.includes('dieuduong')) {
      return true;
    }

    return !!currentWardName && currentWardName !== 'Kho trung tâm' && currentWardName !== 'Tất cả' && currentWardName !== 'Tất cả (Không giới hạn)';
  }, [currentAccount, currentRoleName, currentWardName, isLaundryUser, simulatedRole]);

  const isHousekeepingUser = useMemo(() => {
    if (simulatedRole === 'orderly' || simulatedRole === 'housekeeping') return true;
    if (simulatedRole !== 'all' && simulatedRole !== 'admin' && simulatedRole !== 'ward') return false;
    if (!currentAccount || currentAccount.isAdmin) return false;
    const nameLower = (currentAccount.name || '').toLowerCase();
    const userLower = (currentAccount.username || '').toLowerCase();
    const emailLower = (currentAccount.email || '').toLowerCase();
    const roleLower = (currentRoleName || '').toLowerCase();
    return roleLower.includes('hộ lý') || nameLower.includes('hộ lý') || userLower.includes('.hl') || userLower.includes('holy') || emailLower.includes('.hl') || emailLower.includes('holy');
  }, [currentAccount, currentRoleName, simulatedRole]);

  const isCurrentlyAdmin = useMemo(() => {
    if (simulatedRole === 'admin') return true;
    if (simulatedRole !== 'all') return false;
    return !!currentAccount?.isAdmin;
  }, [currentAccount, simulatedRole]);

  const canSeeReport = useMemo(() => {
    return isCurrentlyAdmin || currentRoleName === 'Trưởng kho đồ vải';
  }, [isCurrentlyAdmin, currentRoleName]);

  useEffect(() => {
    if (!canSeeReport && activeTab === 's-report') {
      setActiveTab('s1');
    } else if (!canSeeLinenDelivery && activeTab.startsWith('s21')) {
      setActiveTab('s1');
    } else if (canSeeLinenDelivery && isLaundryUser && activeTab !== 's21-muc2') {
      setActiveTab('s21-muc2');
    } else if (canSeeLinenDelivery && isWardUser && activeTab === 's21-muc2') {
      setActiveTab('s21-muc1');
    }
  }, [canSeeReport, canSeeLinenDelivery, isWardUser, isLaundryUser, activeTab]);

  // Loading spinner
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F4F7FC] flex items-center justify-center font-medium text-lg text-slate-500">
        Đang tải cơ sở dữ liệu HospLinen Pro...
      </div>
    );
  }

  // Auth lock gate
  if (!currentAccount) {
    return (
      <AuthGate
        accounts={accounts}
        onLogin={handleLogin}
        pendingRegs={pendingRegs}
        onRegisterSubmit={handleRegisterSubmit}
      />
    );
  }

  return (
    <div className="min-h-screen text-[#1A1A1A] p-0 md:p-6 select-none font-sans flex flex-col">
      <div className="max-w-[1400px] w-full mx-auto border-0 md:border border-black/5 bg-white/70 flex-1 flex flex-col p-0 md:p-1 shadow-none md:shadow-2xl rounded-none md:rounded-3xl">
        
        {/* GLOBAL ROLE SIMULATOR BAR FOR TESTING ALL WEB FUNCTIONS */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white p-3 md:p-4 rounded-t-[22px] shadow-xl border-b border-blue-500/30">
          {/* Mobile Collapse Toggle Bar */}
          <div className="md:hidden flex items-center justify-between py-1 px-1">
            <div className="flex items-center gap-1.5 overflow-hidden">
              <span className="bg-amber-400 text-stone-950 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                ⚡ Test
              </span>
              <span className="text-xs font-bold truncate text-amber-200">
                {simulatedRole === 'all' || simulatedRole === 'admin' ? (currentAccount?.isAdmin ? '🛡️ Admin' : `👤 ${currentRoleName}`) : simulatedRole === 'ward' ? `🏢 Khoa: ${simulatedWard}` : simulatedRole === 'orderly' || simulatedRole === 'housekeeping' ? `🧹 Hộ lý: ${simulatedWard}` : simulatedRole === 'linen' ? '👷‍♂️ Trưởng kho đồ vải' : simulatedRole === 'laundry' ? '🚚 Cty Giặt' : '✨ Nhân viên đồ vải'}
              </span>
            </div>
            <button
              onClick={() => setMobileTestBarOpen(!mobileTestBarOpen)}
              className="bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg border border-white/20 flex items-center gap-1 shrink-0"
            >
              <span>{mobileTestBarOpen ? 'Thu gọn' : 'Đổi vai trò'}</span>
              {mobileTestBarOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>

          <div className={`${mobileTestBarOpen ? 'block mt-3 pt-3 border-t border-white/10' : 'hidden'} md:block`}>
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 mb-2.5 pb-2.5 border-b border-white/10">
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-amber-400 text-stone-950 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse shadow-sm">
                    ⚡ Test Nhanh Toàn Hệ Thống
                  </span>
                  <h4 className="text-sm font-black text-white flex items-center gap-1.5 uppercase tracking-wide">
                    Giả Lập Vai Trò Vận Hành Toàn Bộ Web
                  </h4>
                </div>
                <p className="text-xs text-blue-200/90 mt-1">
                  Thay vì phải đăng nhập/đăng xuất từng tài khoản, click chọn vai trò dưới đây để test trực tiếp góc nhìn & toàn bộ thao tác:
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 shrink-0 self-end md:self-auto">
                <button
                  onClick={() => {
                    const next = !isReadOnly;
                    setIsReadOnly(next);
                    triggerToast(
                      next 
                        ? '🔒 Đã bật Chế độ Chỉ xem! Toàn bộ tính năng lưu/gửi/duyệt dữ liệu đã khóa.'
                        : '🔓 Đã tắt Chế độ Chỉ xem! Bạn có thể chỉnh sửa dữ liệu bình thường.',
                      next ? '#EF4444' : '#10B981'
                    );
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 border ${
                    isReadOnly
                      ? 'bg-red-500/20 text-red-400 border-red-500/40 shadow-sm shadow-red-500/10 animate-pulse'
                      : 'bg-white/10 hover:bg-white/20 text-stone-200 border-white/10'
                  }`}
                >
                  {isReadOnly ? '🔒 Đang khóa Chỉ xem' : '🔓 Bật Chỉ xem'}
                </button>

                <span className="text-xs text-stone-300 font-medium">Góc nhìn hiện tại:</span>
                <button
                  onClick={() => setSimulatedRole('all')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${
                    simulatedRole === 'all' || simulatedRole === 'admin'
                      ? 'bg-amber-400 text-stone-950 shadow-md ring-2 ring-amber-300 transform scale-105'
                      : 'bg-white/10 hover:bg-white/20 text-stone-200 border border-white/10'
                  }`}
                >
                  {currentAccount?.isAdmin ? '🛡️ Quản trị viên (Thực tế)' : `👤 Tài khoản: ${currentRoleName}`}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 justify-start md:justify-end">
              <span className="text-xs text-stone-300 mr-1 font-medium">Chuyển góc nhìn test vai trò:</span>
              <button
                onClick={() => {
                  setSimulatedRole('ward');
                  if (activeTab.startsWith('s21') && activeTab === 's21-muc2') {
                    setActiveTab('s21-muc1');
                  }
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  simulatedRole === 'ward' || simulatedRole === 'orderly' || simulatedRole === 'housekeeping'
                    ? 'bg-blue-600 text-white font-black ring-2 ring-amber-400 shadow-md transform scale-[1.02]'
                    : 'bg-white/10 hover:bg-white/20 text-stone-200 border border-white/5'
                }`}
              >
                🏢 Khoa phòng (Điều dưỡng / Hộ lý)
              </button>
              <button
                onClick={() => setSimulatedRole('linen')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  simulatedRole === 'linen'
                    ? 'bg-emerald-600 text-white font-black ring-2 ring-amber-400 shadow-md transform scale-[1.02]'
                    : 'bg-white/10 hover:bg-white/20 text-stone-200 border border-white/5'
                }`}
              >
                👷‍♂️ Trưởng kho đồ vải
              </button>
              <button
                onClick={() => {
                  setSimulatedRole('laundry');
                  setActiveTab('s21-muc2');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  simulatedRole === 'laundry'
                    ? 'bg-purple-600 text-white font-black ring-2 ring-amber-400 shadow-md transform scale-[1.02]'
                    : 'bg-white/10 hover:bg-white/20 text-stone-200 border border-white/5'
                }`}
              >
                🚚 Cty Giặt (Xưởng)
              </button>
              <button
                onClick={() => {
                  setSimulatedRole('clean');
                  if (activeTab.startsWith('s21') && activeTab === 's21-muc2') {
                    setActiveTab('s21-muc3');
                  }
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  simulatedRole === 'clean'
                    ? 'bg-teal-600 text-white font-black ring-2 ring-amber-400 shadow-md transform scale-[1.02]'
                    : 'bg-white/10 hover:bg-white/20 text-stone-200 border border-white/5'
                }`}
              >
                ✨ Nhân viên đồ vải
              </button>
            </div>

            {/* DEDICATED WARD SIMULATION & NAVIGATION PANEL */}
            {(simulatedRole === 'ward' || simulatedRole === 'orderly' || simulatedRole === 'housekeeping') && (
              <div className="mt-3 pt-3 border-t border-blue-500/30 bg-blue-950/50 p-3 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 animate-fadeIn">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
                    🏢 Chọn Khoa Phòng giả lập:
                  </span>
                  <select
                    value={simulatedWard}
                    onChange={(e) => setSimulatedWard(e.target.value)}
                    style={{ backgroundColor: '#ffffff', color: '#000000', fontWeight: '800' }}
                    className="bg-white text-black text-xs font-black px-3 py-1.5 rounded-lg border-2 border-amber-400 focus:outline-none focus:ring-4 focus:ring-amber-300 shadow-xl cursor-pointer max-w-xs transition-all"
                  >
                    {departments.map((dept) => (
                      <option key={dept} value={dept} style={{ backgroundColor: '#ffffff', color: '#000000', fontWeight: 'bold' }} className="bg-white text-black font-bold py-1">
                        {dept}
                      </option>
                    ))}
                  </select>

                  <span className="text-xs font-medium text-stone-300 ml-1">Chức năng:</span>
                  <div className="flex items-center gap-1 bg-black/30 p-1 rounded-lg border border-white/10">
                    <button
                      onClick={() => setSimulatedRole('ward')}
                      className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                        simulatedRole === 'ward'
                          ? 'bg-blue-600 text-white shadow font-black'
                          : 'text-stone-300 hover:text-white'
                      }`}
                    >
                      👩‍⚕️ Điều dưỡng
                    </button>
                    <button
                      onClick={() => setSimulatedRole('orderly')}
                      className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                        simulatedRole === 'orderly' || simulatedRole === 'housekeeping'
                          ? 'bg-blue-600 text-white shadow font-black'
                          : 'text-stone-300 hover:text-white'
                      }`}
                    >
                      🧹 Hộ lý
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 self-stretch md:self-auto justify-end">
                  <span className="text-[11px] text-blue-200 mr-1 font-semibold hidden lg:inline">Nút test nhanh luồng kho khoa:</span>
                  <button
                    onClick={() => setActiveTab('s1')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 shadow ${
                      activeTab === 's1'
                        ? 'bg-amber-400 text-stone-950 ring-2 ring-white scale-105'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    }`}
                  >
                    📦 Coi tồn kho Khoa
                  </button>
                  {!isHousekeepingUser && (
                    <button
                      onClick={() => setActiveTab('s12')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 shadow ${
                        activeTab === 's12'
                          ? 'bg-amber-400 text-stone-950 ring-2 ring-white scale-105'
                          : 'bg-blue-600 hover:bg-blue-500 text-white'
                      }`}
                    >
                      🔄 Luồng Xuất/Nhập
                    </button>
                  )}
                  {canSeeLinenDelivery && (
                    <button
                      onClick={() => setActiveTab('s21-muc1')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 shadow ${
                        activeTab === 's21-muc1'
                          ? 'bg-amber-400 text-stone-950 ring-2 ring-white scale-105'
                          : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                      }`}
                    >
                      📋 Phiếu Giao/Nhận
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* EDITORIAL DOUBLE BORDER TOP HEADER */}
        <header className="py-2.5 px-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-2 bg-white/40 backdrop-blur-md border-b border-black/5">
          <div>
            {!isOnline && (
              <div className="mb-1">
                <span className="px-1.5 py-0 text-[8px] font-black uppercase tracking-wider rounded bg-amber-500 text-white animate-pulse">
                  ⚠️ Chế độ ngoại tuyến (Tự động lưu nháp)
                </span>
              </div>
            )}
            <h1 className="font-black text-2xl md:text-[26px] tracking-tight text-[#1D1D1F] leading-none flex items-center">
              <Shirt className="text-[#007AFF] shrink-0 mr-2 -mt-0.5" size={26} />
              <span>HospLinen<span className="font-bold text-[11px] tracking-widest bg-gradient-to-r from-[#007AFF] to-[#AF52DE] text-white px-2 py-0.5 ml-1.5 rounded-full inline-block align-middle uppercase shadow-md shadow-blue-500/15">PRO</span></span>
            </h1>
          </div>

          <div className="flex flex-row items-center gap-3 pl-3 md:pl-0 pr-0 md:pr-3 border-l md:border-l-0 md:border-r border-black/10 border-dashed shrink-0">
            {/* 🔥 RESET HỆ THỐNG */}
            <button
              onClick={() => {
                if (window.confirm("Cảnh báo: Bạn có chắc chắn muốn RESET TOÀN BỘ HỆ THỐNG?\nThao tác này sẽ xóa sạch toàn bộ phiếu dơ/sạch, nợ nần, khôi phục tồn kho chính thức và xóa toàn bộ lịch sử vận hành.")) {
                  saveAllStates(INITIAL_LINEN_ITEMS, INITIAL_DETAIL_ALLOCATIONS, roles, users, accounts, [], [], departments, [], [], {}, {}, {});
                  triggerToast('🧹 Đã xóa toàn bộ dữ liệu vận hành & reset hệ thống thành công!', '#16A34A');
                }
              }}
              className="px-2.5 py-1.5 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-700 hover:to-amber-700 text-white text-[10px] md:text-xs font-black uppercase rounded-lg shadow-md flex items-center gap-1.5 transition-all cursor-pointer border border-rose-500/20 active:scale-95 shrink-0"
              title="Reset sạch toàn bộ hệ thống ngay lập tức"
            >
              🔥 Reset Hệ Thống
            </button>

            <div className="text-left md:text-right">
              <span className="block text-[8px] uppercase tracking-widest font-bold text-[#86868B]">Phiên trực tuyến</span>
              <div className="font-bold text-sm leading-tight text-[#1D1D1F] mt-0.5">{effectiveAccount?.name || currentAccount.name}</div>
              <div className="text-[9px] mt-1 flex flex-wrap gap-1 md:justify-end">
                <span className={`px-1.5 py-0.5 rounded-full font-mono text-[8px] uppercase border ${simulatedRole !== 'all' ? 'bg-amber-100 text-amber-800 border-amber-300 font-bold' : 'bg-black/5 text-[#1D1D1F] border-black/5'}`}>
                  {simulatedRole === 'ward' ? 'Góc nhìn: Điều dưỡng Khoa' : simulatedRole === 'orderly' || simulatedRole === 'housekeeping' ? 'Góc nhìn: Hộ lý Khoa' : simulatedRole === 'linen' ? 'Góc nhìn: Trưởng kho đồ vải' : simulatedRole === 'laundry' ? 'Góc nhìn: Cty Giặt Xưởng' : simulatedRole === 'clean' ? 'Góc nhìn: Nhân viên đồ vải' : currentRoleName}
                </span>
                <span className={`px-1.5 py-0.5 rounded-full font-mono text-[8px] uppercase border ${simulatedRole !== 'all' ? 'bg-blue-100 text-blue-800 border-blue-300 font-bold' : 'bg-[#007AFF]/10 border-[#007AFF]/20 text-[#007AFF]'}`}>
                  {simulatedRole === 'laundry' ? 'Xưởng giặt Cty' : simulatedRole === 'linen' || simulatedRole === 'clean' ? 'Kho trung tâm BV' : currentWardName}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* MAIN TWO COLUMN GRID LAYOUT */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-black/5">
          
          {/* NAVIGATION RAIL SIDEBAR (Column 1 - Desktop only) */}
          <aside className="hidden md:flex md:col-span-1 p-4 flex-col justify-between space-y-8 bg-black/[0.01] no-print rounded-bl-3xl">
            <div className="space-y-6">
              
              {!isLaundryUser && (
                <div>
                  <span className="block text-[9px] uppercase tracking-widest font-bold text-[#86868B] mb-3">
                    1. Danh mục & Kho hàng
                  </span>
                  <nav className="flex flex-col gap-1.5">
                    <button
                      onClick={() => setActiveTab('s1')}
                      className={`flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-bold uppercase tracking-wider text-left transition-all rounded-xl ${
                        activeTab === 's1'
                          ? 'bg-gradient-to-r from-[#007AFF] to-[#0056B3] text-white shadow-lg shadow-blue-500/20'
                          : 'hover:bg-black/5 text-slate-700'
                      }`}
                    >
                      <LayoutDashboard size={14} />
                      Danh mục & Tồn kho
                    </button>
                    {!isHousekeepingUser && (
                      <button
                        onClick={() => setActiveTab('s12')}
                        className={`flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-bold uppercase tracking-wider text-left transition-all rounded-xl ${
                          activeTab === 's12'
                            ? 'bg-gradient-to-r from-[#007AFF] to-[#0056B3] text-white shadow-lg shadow-blue-500/20'
                            : 'hover:bg-black/5 text-slate-700'
                        }`}
                      >
                        <ArrowLeftRight size={14} />
                        Nhập / Xuất kho
                      </button>
                    )}
                  </nav>
                </div>
              )}

              {canSeeLinenDelivery && (
                <div>
                  <span className="block text-[9px] uppercase tracking-widest font-bold text-[#86868B] mb-3">
                    2. Vận hành Giao nhận đồ vải
                  </span>
                  <nav className="flex flex-col gap-1.5">
                    {!isLaundryUser && (
                      <button
                        onClick={() => setActiveTab('s21-muc1')}
                        className={`flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-bold uppercase tracking-wider text-left transition-all rounded-xl relative overflow-hidden ${
                          activeTab === 's21-muc1'
                            ? 'bg-gradient-to-r from-[#007AFF] to-[#0056B3] text-white shadow-lg shadow-blue-500/20'
                            : 'hover:bg-black/5 text-slate-700'
                        }`}
                      >
                        <ClipboardCheck size={14} />
                        <span>Giao nhận đồ vải dơ</span>
                      </button>
                    )}
                    {!isWardUser && (
                      <button
                        onClick={() => setActiveTab('s21-muc2')}
                        className={`flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-bold uppercase tracking-wider text-left transition-all rounded-xl ${
                          activeTab === 's21-muc2'
                            ? 'bg-gradient-to-r from-[#007AFF] to-[#0056B3] text-white shadow-lg shadow-blue-500/20'
                            : 'hover:bg-black/5 text-slate-700'
                        }`}
                      >
                        <Truck size={14} />
                        <span>Giao nhận đồ vải sạch công ty</span>
                      </button>
                    )}
                    {!isLaundryUser && (
                      <button
                        onClick={() => setActiveTab('s21-muc3')}
                        className={`flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-bold uppercase tracking-wider text-left transition-all rounded-xl ${
                          activeTab === 's21-muc3'
                            ? 'bg-gradient-to-r from-[#007AFF] to-[#0056B3] text-white shadow-lg shadow-blue-500/20'
                            : 'hover:bg-black/5 text-slate-700'
                        }`}
                      >
                        <CheckCircle size={14} />
                        <span>Giao nhận đồ vải sạch khoa phòng</span>
                      </button>
                    )}

                  </nav>
                </div>
              )}

              {canSeeReport && (
                <div>
                  <span className="block text-[9px] uppercase tracking-widest font-bold text-[#86868B] mb-3">
                    3. Báo cáo thống kê
                  </span>
                  <nav className="flex flex-col gap-1.5">
                    <button
                      onClick={() => setActiveTab('s-report')}
                      className={`flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-bold uppercase tracking-wider text-left transition-all rounded-xl ${
                        activeTab === 's-report'
                          ? 'bg-gradient-to-r from-[#007AFF] to-[#0056B3] text-white shadow-lg shadow-blue-500/20'
                          : 'hover:bg-black/5 text-slate-700'
                      }`}
                    >
                      <TrendingUp size={14} />
                      Báo cáo & Phân tích
                    </button>
                  </nav>
                </div>
              )}

              {isCurrentlyAdmin && (
                <div>
                  <span className="block text-[9px] uppercase tracking-widest font-bold text-[#86868B] mb-3">
                    4. Thiết lập hệ thống
                  </span>
                  <nav className="flex flex-col gap-1.5">
                    <button
                      onClick={() => setActiveTab('s-roles')}
                      className={`flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-bold uppercase tracking-wider text-left transition-all rounded-xl ${
                        activeTab === 's-roles'
                          ? 'bg-gradient-to-r from-[#007AFF] to-[#0056B3] text-white shadow-lg shadow-blue-500/20'
                          : 'hover:bg-black/5 text-slate-700'
                      }`}
                    >
                      <FolderSync size={14} />
                      Quản lý vai trò
                    </button>
                    <button
                      onClick={() => setActiveTab('s-users')}
                      className={`flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-bold uppercase tracking-wider text-left transition-all rounded-xl ${
                        activeTab === 's-users'
                          ? 'bg-gradient-to-r from-[#007AFF] to-[#0056B3] text-white shadow-lg shadow-blue-500/20'
                          : 'hover:bg-black/5 text-slate-700'
                      }`}
                    >
                      <Users size={14} />
                      Quản lý người dùng
                    </button>
                    <button
                      onClick={() => setActiveTab('s-depts')}
                      className={`flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-bold uppercase tracking-wider text-left transition-all rounded-xl ${
                        activeTab === 's-depts'
                          ? 'bg-gradient-to-r from-[#007AFF] to-[#0056B3] text-white shadow-lg shadow-blue-500/20'
                          : 'hover:bg-black/5 text-slate-700'
                      }`}
                    >
                      <MapPin size={14} />
                      Quản lý khoa phòng
                    </button>
                  </nav>
                </div>
              )}
            </div>

            {/* Sidebar bottom decoration & log out button */}
            <div className="pt-6 border-t border-black/5 space-y-4">
              {pendingRegs.filter(p => p.status === 'pending').length > 0 && isCurrentlyAdmin && (
                <button
                  onClick={() => setActiveTab('s-users')}
                  className="w-full text-center py-2 px-3 bg-[#FEF3C7] border border-[#D97706] text-[#92400E] text-[10px] font-bold uppercase tracking-wider animate-pulse flex items-center justify-center gap-1.5"
                >
                  <Users size={12} />
                  {pendingRegs.filter(p => p.status === 'pending').length} đăng ký chờ phê duyệt
                </button>
              )}

              <button
                onClick={handleLogout}
                className="w-full py-2.5 px-4 bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-red-400 text-xs font-semibold uppercase tracking-widest transition-all rounded-xl flex items-center justify-center gap-1.5"
              >
                <LogOut size={12} />
                Đăng Xuất
              </button>
            </div>
          </aside>

          {/* MAIN CANVAS COMPOSITION SCREEN (Column 2,3,4) */}
          <main className="md:col-span-3 p-3 md:p-6 pb-24 md:pb-6 overflow-y-auto">
            
            {isReadOnly && (
              <div className="mb-4 bg-red-500/10 border border-red-500/20 text-red-700 p-3.5 rounded-2xl flex items-start gap-3 shadow-2xs animate-fadeIn">
                <span className="text-xl shrink-0">🔒</span>
                <div className="text-xs">
                  <p className="font-bold text-red-800 uppercase tracking-wide">
                    Hệ thống đang ở Chế độ Chỉ Xem (Read-only)
                  </p>
                  <p className="text-red-700/90 mt-0.5 leading-relaxed">
                    Bạn có thể tự do chuyển đổi các Góc nhìn vai trò (Điều dưỡng, Hộ lý, Kho vải, Xưởng giặt...) để trải nghiệm toàn bộ quy trình nghiệp vụ. Tuy nhiên, tính năng lưu, gửi hoặc duyệt dữ liệu đã được khóa để bảo vệ dữ liệu gốc.
                  </p>
                </div>
              </div>
            )}

            {!isLaundryUser && activeTab === 's1' && (
              <InventoryScreen
                items={items}
                detailAllocations={detailAllocations}
                temporaryCleanStore={temporaryCleanStore}
                temporaryDirtyStore={temporaryDirtyStore}
                temporaryCompanyDirtyStore={temporaryCompanyDirtyStore}
                onAddItem={handleAddItem}
                onEditItem={handleEditItem}
                onDeleteItem={handleDeleteItem}
                onImportBackup={handleImportBackup}
                onExportBackup={handleExportBackup}
                onInitTest={handleInitTestStock}
                onViewAllocations={(ma, ten) => setAllocationModal({ ma, ten })}
                onUpdateInventory={(newItems, newDetail) => saveAllStates(newItems, newDetail, roles, users, accounts, history, pendingRegs, departments, wardDeliverySlips, laundryDispatches, temporaryCleanStore)}
                isAdmin={effectiveAccount?.isAdmin || currentRoleName.includes('Thủ kho')}
                departments={departments}
                userDept={currentWardName}
              />
            )}

            {!isLaundryUser && activeTab === 's12' && (
              <TransactionScreen
                items={items}
                detailAllocations={detailAllocations}
                history={history}
                currentAccount={effectiveAccount || currentAccount}
                users={users}
                roles={roles}
                onSubmitTransaction={handleSubmitTransaction}
                onConfirmXuat={handleConfirmXuat}
                onRejectXuat={handleRejectXuat}
                onDeleteTransaction={handleDeleteTransaction}
                onUpdateTransaction={handleUpdateTransaction}
                departments={departments}
                userDept={currentWardName}
              />
            )}

            {activeTab.startsWith('s21') && (
              canSeeLinenDelivery ? (
                <DeliveryFlow
                  items={items}
                  detailAllocations={detailAllocations}
                  currentAccount={effectiveAccount || currentAccount}
                  currentWardName={currentWardName}
                  currentRoleName={currentRoleName}
                  isWardUser={isWardUser}
                  isLaundryUser={isLaundryUser}
                  users={users}
                  roles={roles}
                  departments={departments}
                  wardDeliverySlips={wardDeliverySlips}
                  laundryDispatches={laundryDispatches}
                  temporaryCleanStore={temporaryCleanStore}
                  temporaryDirtyStore={temporaryDirtyStore}
                  temporaryCompanyDirtyStore={temporaryCompanyDirtyStore}
                  onUpdateWardDeliverySlips={(newSlips) => saveAllStates(items, detailAllocations, roles, users, accounts, history, pendingRegs, departments, newSlips, laundryDispatches, temporaryCleanStore, temporaryDirtyStore, temporaryCompanyDirtyStore)}
                  onUpdateLaundryDispatches={(newDispatches) => saveAllStates(items, detailAllocations, roles, users, accounts, history, pendingRegs, departments, wardDeliverySlips, newDispatches, temporaryCleanStore, temporaryDirtyStore, temporaryCompanyDirtyStore)}
                  onUpdateTemporaryCleanStore={(newTempStore) => saveAllStates(items, detailAllocations, roles, users, accounts, history, pendingRegs, departments, wardDeliverySlips, laundryDispatches, newTempStore, temporaryDirtyStore, temporaryCompanyDirtyStore)}
                  onUpdateTemporaryDirtyStore={(newTempDirtyStore) => saveAllStates(items, detailAllocations, roles, users, accounts, history, pendingRegs, departments, wardDeliverySlips, laundryDispatches, temporaryCleanStore, newTempDirtyStore, temporaryCompanyDirtyStore)}
                  onUpdateTemporaryCompanyDirtyStore={(newTempCompDirty) => saveAllStates(items, detailAllocations, roles, users, accounts, history, pendingRegs, departments, wardDeliverySlips, laundryDispatches, temporaryCleanStore, temporaryDirtyStore, newTempCompDirty)}
                  onUpdateDeliveryStates={(params) => {
                    const nextHistory = params.clearHistory ? [] : history;
                    const nextWardSlips = 'wardSlips' in params && params.wardSlips !== undefined ? params.wardSlips : wardDeliverySlips;
                    const nextLaundryDispatches = 'laundryDispatches' in params && params.laundryDispatches !== undefined ? params.laundryDispatches : laundryDispatches;
                    const nextCleanStore = 'temporaryCleanStore' in params && params.temporaryCleanStore !== undefined ? params.temporaryCleanStore : temporaryCleanStore;
                    const nextDirtyStore = 'temporaryDirtyStore' in params && params.temporaryDirtyStore !== undefined ? params.temporaryDirtyStore : temporaryDirtyStore;
                    const nextCompanyDirtyStore = 'temporaryCompanyDirtyStore' in params && params.temporaryCompanyDirtyStore !== undefined ? params.temporaryCompanyDirtyStore : temporaryCompanyDirtyStore;
                    
                    saveAllStates(
                      items,
                      detailAllocations,
                      roles,
                      users,
                      accounts,
                      nextHistory,
                      pendingRegs,
                      departments,
                      nextWardSlips,
                      nextLaundryDispatches,
                      nextCleanStore,
                      nextDirtyStore,
                      nextCompanyDirtyStore
                    );
                  }}
                  onCompleteCycle={handleCompleteDeliveryCycle}
                  activeMuc={activeTab === 's21-muc2' ? 2 : activeTab === 's21-muc3' ? 3 : activeTab === 's21-muc4' ? 4 : 1}
                  onActiveMucChange={(muc) => setActiveTab(`s21-muc${muc}` as any)}
                  simulatedRole={simulatedRole}
                />
              ) : (
                <div className="p-12 text-center text-stone-500 font-medium bg-white rounded-2xl shadow-sm border border-stone-200 my-8">
                  <div className="text-3xl mb-3">🔒</div>
                  <h3 className="text-base font-bold text-stone-800 mb-1">Không Có Quyền Truy Cập</h3>
                  <p className="text-xs text-stone-500 max-w-md mx-auto">
                    Vai trò của bạn chưa được kích hoạt quyền <strong>"Xử lý đồ vải"</strong> để truy cập chức năng Vận hành giao nhận đồ vải. Vui lòng liên hệ Quản trị viên để được phân quyền.
                  </p>
                </div>
              )
            )}

            {activeTab === 's-report' && (
              canSeeReport ? (
                <ReportDashboardScreen
                  wardDeliverySlips={wardDeliverySlips}
                  laundryDispatches={laundryDispatches}
                  items={items}
                  history={history}
                  departments={departments}
                  isWardUser={isWardUser}
                  currentWardName={currentWardName}
                  detailAllocations={detailAllocations}
                  onGenerateTestData={handleGenerateReportTestData}
                  hasSimulatedData={hasSimulatedData}
                  onClearTestData={handleClearReportTestData}
                />
              ) : (
                <div className="p-12 text-center text-stone-500 font-medium bg-white rounded-2xl shadow-sm border border-stone-200 my-8">
                  <div className="text-3xl mb-3">🔒</div>
                  <h3 className="text-base font-bold text-stone-800 mb-1">Không Có Quyền Truy Cập</h3>
                  <p className="text-xs text-stone-500 max-w-md mx-auto">
                    Chức năng Báo cáo thống kê chỉ dành riêng cho <strong>Quản trị viên (Admin)</strong> và <strong>Trưởng kho đồ vải</strong>.
                  </p>
                </div>
              )
            )}

            {activeTab === 's-roles' && isCurrentlyAdmin && (
              <AdminScreens
                roles={roles}
                users={users}
                accounts={accounts}
                pendingRegs={pendingRegs}
                onUpdateRoles={(newRoles, newUsers) => saveAllStates(items, detailAllocations, newRoles, newUsers || users, accounts, history, pendingRegs)}
                onUpdateUsers={(newUsers, newAccs, newPending) => saveAllStates(items, detailAllocations, roles, newUsers, newAccs, history, newPending || pendingRegs)}
                onUpdatePendingRegs={newPending => saveAllStates(items, detailAllocations, roles, users, accounts, history, newPending)}
                activeSubTab="roles"
                departments={departments}
                onUpdateDepartments={handleUpdateDepartments}
                isAdmin={currentAccount.isAdmin}
                detailAllocations={detailAllocations}
              />
            )}

            {activeTab === 's-users' && isCurrentlyAdmin && (
              <AdminScreens
                roles={roles}
                users={users}
                accounts={accounts}
                pendingRegs={pendingRegs}
                onUpdateRoles={(newRoles, newUsers) => saveAllStates(items, detailAllocations, newRoles, newUsers || users, accounts, history, pendingRegs)}
                onUpdateUsers={(newUsers, newAccs, newPending) => saveAllStates(items, detailAllocations, roles, newUsers, newAccs, history, newPending || pendingRegs)}
                onUpdatePendingRegs={newPending => saveAllStates(items, detailAllocations, roles, users, accounts, history, newPending)}
                activeSubTab="users"
                departments={departments}
                onUpdateDepartments={handleUpdateDepartments}
                isAdmin={currentAccount.isAdmin}
                detailAllocations={detailAllocations}
              />
            )}

            {activeTab === 's-depts' && isCurrentlyAdmin && (
              <AdminScreens
                roles={roles}
                users={users}
                accounts={accounts}
                pendingRegs={pendingRegs}
                onUpdateRoles={(newRoles, newUsers) => saveAllStates(items, detailAllocations, newRoles, newUsers || users, accounts, history, pendingRegs)}
                onUpdateUsers={(newUsers, newAccs, newPending) => saveAllStates(items, detailAllocations, roles, newUsers, newAccs, history, newPending || pendingRegs)}
                onUpdatePendingRegs={newPending => saveAllStates(items, detailAllocations, roles, users, accounts, history, newPending)}
                activeSubTab="depts"
                departments={departments}
                onUpdateDepartments={handleUpdateDepartments}
                isAdmin={currentAccount.isAdmin}
                detailAllocations={detailAllocations}
              />
            )}

          </main>
        </div>
      </div>

      {/* MOBILE SLIDE-OVER DRAWER MENU */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end md:hidden animate-fadeIn">
          <div className="w-[85vw] max-w-sm bg-white h-full p-5 flex flex-col justify-between overflow-y-auto shadow-2xl">
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                <div className="flex items-center gap-2">
                  <Shirt className="text-blue-600" size={22} />
                  <span className="font-black text-lg text-stone-900">Menu Chức Năng</span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 bg-stone-100 hover:bg-stone-200 rounded-full text-stone-700"
                >
                  <X size={18} />
                </button>
              </div>

              {!isLaundryUser && (
                <div>
                  <span className="block text-[10px] uppercase tracking-widest font-bold text-stone-400 mb-2.5">
                    1. Danh mục & Kho hàng
                  </span>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => { setActiveTab('s1'); setMobileMenuOpen(false); }}
                      className={`flex items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-xl ${activeTab === 's1' ? 'bg-blue-600 text-white shadow-md' : 'bg-stone-100 text-stone-800'}`}
                    >
                      <LayoutDashboard size={16} />
                      Danh mục & Tồn kho
                    </button>
                    {!isHousekeepingUser && (
                      <button
                        onClick={() => { setActiveTab('s12'); setMobileMenuOpen(false); }}
                        className={`flex items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-xl ${activeTab === 's12' ? 'bg-blue-600 text-white shadow-md' : 'bg-stone-100 text-stone-800'}`}
                      >
                        <ArrowLeftRight size={16} />
                        Nhập / Xuất kho
                      </button>
                    )}
                  </div>
                </div>
              )}

              {canSeeLinenDelivery && (
                <div>
                  <span className="block text-[10px] uppercase tracking-widest font-bold text-stone-400 mb-2.5">
                    2. Vận hành Giao nhận
                  </span>
                  <div className="flex flex-col gap-2">
                    {!isLaundryUser && (
                      <button
                        onClick={() => { setActiveTab('s21-muc1'); setMobileMenuOpen(false); }}
                        className={`flex items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-xl ${activeTab === 's21-muc1' ? 'bg-blue-600 text-white shadow-md' : 'bg-stone-100 text-stone-800'}`}
                      >
                        <ClipboardCheck size={16} />
                        <span>Giao nhận đồ vải dơ</span>
                      </button>
                    )}
                    {!isWardUser && (
                      <button
                        onClick={() => { setActiveTab('s21-muc2'); setMobileMenuOpen(false); }}
                        className={`flex items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-xl ${activeTab === 's21-muc2' ? 'bg-blue-600 text-white shadow-md' : 'bg-stone-100 text-stone-800'}`}
                      >
                        <Truck size={16} />
                        <span>Giao nhận đồ vải sạch công ty</span>
                      </button>
                    )}
                    {!isLaundryUser && (
                      <button
                        onClick={() => { setActiveTab('s21-muc3'); setMobileMenuOpen(false); }}
                        className={`flex items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-xl ${activeTab === 's21-muc3' ? 'bg-blue-600 text-white shadow-md' : 'bg-stone-100 text-stone-800'}`}
                      >
                        <CheckCircle size={16} />
                        <span>Giao nhận đồ vải sạch khoa phòng</span>
                      </button>
                    )}

                  </div>
                </div>
              )}

              {canSeeReport && (
                <div>
                  <span className="block text-[10px] uppercase tracking-widest font-bold text-stone-400 mb-2.5">
                    3. Báo cáo thống kê
                  </span>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => { setActiveTab('s-report'); setMobileMenuOpen(false); }}
                      className={`flex items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-xl ${activeTab === 's-report' ? 'bg-blue-600 text-white shadow-md' : 'bg-stone-100 text-stone-800'}`}
                    >
                      <TrendingUp size={16} />
                      Báo cáo & Phân tích
                    </button>
                  </div>
                </div>
              )}

              {isCurrentlyAdmin && (
                <div>
                  <span className="block text-[10px] uppercase tracking-widest font-bold text-stone-400 mb-2.5">
                    4. Quản trị hệ thống
                  </span>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => { setActiveTab('s-users'); setMobileMenuOpen(false); }}
                      className={`flex items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-xl ${activeTab === 's-users' ? 'bg-blue-600 text-white shadow-md' : 'bg-stone-100 text-stone-800'}`}
                    >
                      <Users size={16} />
                      Tài khoản & Phê duyệt ({pendingRegs.filter(p => p.status === 'pending').length})
                    </button>
                    <button
                      onClick={() => { setActiveTab('s-roles'); setMobileMenuOpen(false); }}
                      className={`flex items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-xl ${activeTab === 's-roles' ? 'bg-blue-600 text-white shadow-md' : 'bg-stone-100 text-stone-800'}`}
                    >
                      <FolderSync size={16} />
                      Phân quyền vai trò
                    </button>
                    <button
                      onClick={() => { setActiveTab('s-depts'); setMobileMenuOpen(false); }}
                      className={`flex items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-xl ${activeTab === 's-depts' ? 'bg-blue-600 text-white shadow-md' : 'bg-stone-100 text-stone-800'}`}
                    >
                      <MapPin size={16} />
                      Quản lý khoa phòng
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-6 border-t border-stone-200 space-y-3 mt-auto">
              <button
                onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
                className="w-full py-3 px-4 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 text-xs font-bold uppercase tracking-widest transition-all rounded-xl flex items-center justify-center gap-2"
              >
                <LogOut size={16} />
                Đăng Xuất
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE FLOATING BOTTOM NAVIGATION BAR */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200 shadow-[0_-4px_25px_rgba(0,0,0,0.1)] flex justify-around items-center py-1.5 px-1">
        {!isLaundryUser && (
          <button
            onClick={() => setActiveTab('s1')}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg ${activeTab === 's1' ? 'text-blue-600 font-black' : 'text-stone-500'}`}
          >
            <Package size={18} />
            <span className="text-[10px] mt-0.5">Tồn Kho</span>
          </button>
        )}
        {canSeeLinenDelivery && !isLaundryUser && (
          <button
            onClick={() => setActiveTab('s21-muc1')}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg ${activeTab === 's21-muc1' ? 'text-blue-600 font-black' : 'text-stone-500'}`}
          >
            <ClipboardCheck size={18} />
            <span className="text-[10px] mt-0.5">Đồ dơ</span>
          </button>
        )}
        {canSeeLinenDelivery && !isWardUser && (
          <button
            onClick={() => setActiveTab('s21-muc2')}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg ${activeTab === 's21-muc2' ? 'text-blue-600 font-black' : 'text-stone-500'}`}
          >
            <Truck size={18} />
            <span className="text-[10px] mt-0.5">Sạch Cty</span>
          </button>
        )}
        {canSeeLinenDelivery && !isLaundryUser && (
          <button
            onClick={() => setActiveTab('s21-muc3')}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg ${activeTab === 's21-muc3' ? 'text-blue-600 font-black' : 'text-stone-500'}`}
          >
            <CheckCircle size={18} />
            <span className="text-[10px] mt-0.5">Sạch Khoa</span>
          </button>
        )}
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="flex flex-col items-center justify-center py-1 px-2 rounded-lg text-stone-500 hover:text-blue-600"
        >
          <Menu size={18} />
          <span className="text-[10px] mt-0.5">Menu</span>
        </button>
      </div>

      {/* POPUP OVERLAY DIALOG: DETAILED WARD ALLOCATIONS LIST */}
      {allocationModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md border border-[#1A1A1A] bg-[#F5F2ED] p-1 fade-in">
            <div className="border border-[#1A1A1A] p-5 space-y-4">
              
              <div className="flex justify-between items-start pb-2 border-b border-[#1A1A1A]">
                <div>
                  <h3 className="font-serif font-black text-lg text-[#1A1A1A]">{allocationModal.ten}</h3>
                  <p className="text-[10px] text-[#8C8984] font-mono">Mã: {allocationModal.ma}</p>
                </div>
                <button
                  onClick={() => setAllocationModal(null)}
                  className="text-stone-400 hover:text-stone-900 text-lg font-bold"
                >
                  &times;
                </button>
              </div>

              {/* Locations allocations list */}
              <div className="max-h-64 overflow-y-auto space-y-1 divide-y divide-[#1A1A1A]/10 pr-1">
                {/* Main Store Line */}
                <div className="py-2.5 flex justify-between items-center text-xs bg-[#EBE8E3] px-2 font-mono">
                  <span className="font-bold text-[#1A1A1A]">🏢 Kho trung tâm chính</span>
                  <span className="font-bold text-[#2563EB]">
                    {(items.find(i => i.ma === allocationModal.ma)?.kc || 0).toLocaleString()} cái
                  </span>
                </div>

                {/* Ward allocations lines */}
                {(detailAllocations[allocationModal.ma] || []).length === 0 ? (
                  <div className="py-4 text-center text-stone-400 text-xs italic font-serif">
                    Chưa phân bổ bất kỳ cái nào tới các khoa phòng buồng bệnh.
                  </div>
                ) : (
                  (detailAllocations[allocationModal.ma] || []).map(([dept, qty]) => (
                    <div key={dept} className="py-2 px-2 flex justify-between items-center text-xs hover:bg-[#EBE8E3]">
                      <span className="text-stone-700 flex items-center gap-1">
                        <MapPin size={10} className="text-[#8C8984]" />
                        {dept}
                      </span>
                      <span className="font-mono font-bold text-stone-900">{qty.toLocaleString()} cái</span>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-3 border-t border-[#1A1A1A] border-dashed flex justify-between items-center text-[10px] font-mono text-[#8C8984]">
                <span>Tổng viện: {((items.find(i => i.ma === allocationModal.ma)?.kc || 0) + (detailAllocations[allocationModal.ma] || []).reduce((s, r) => s + r[1], 0)).toLocaleString()} cái</span>
                <button
                  onClick={() => setAllocationModal(null)}
                  className="px-3 py-1 border border-[#1A1A1A] hover:bg-[#EBE8E3] text-[10px] font-bold uppercase tracking-wider text-[#1A1A1A]"
                >
                  Đóng
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* FLOATING TOASTS NOTIFICATIONS DRAWER */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className="p-3 border border-[#1A1A1A] bg-[#F5F2ED] text-xs font-semibold text-[#1A1A1A] flex items-center gap-2 shadow-md fade-in pointer-events-auto"
            style={{ borderLeftWidth: '6px', borderLeftColor: t.color }}
          >
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />
            <span>{t.text}</span>
          </div>
        ))}
      </div>

    </div>
  );
}
