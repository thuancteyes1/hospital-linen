import { useState, useEffect, useMemo } from 'react';
import { LinenItem, Role, User, Account, HistoryItem, PendingRegistration, DEPARTMENTS, WardDeliverySlip, LaundryDispatch } from '../types';
import {
  INITIAL_LINEN_ITEMS,
  INITIAL_DETAIL_ALLOCATIONS,
  INITIAL_ROLES,
  INITIAL_USERS,
  INITIAL_ACCOUNTS,
  INITIAL_WARD_DELIVERY_SLIPS,
  INITIAL_LAUNDRY_DISPATCHES
} from '../data';

const LOCAL_STORAGE_KEY = 'HospLinenPro_test_100_0_state';

export function useLinenState(triggerToast: (text: string, color?: string) => void) {
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

  // --- UI STATES ---
  const [activeTab, setActiveTab] = useState<'s1' | 's12' | 's-roles' | 's-users' | 's-depts' | 's-report' | 's21-muc1' | 's21-muc2' | 's21-muc3' | 's21-muc4'>('s1');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileTestBarOpen, setMobileTestBarOpen] = useState(false);
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
      triggerToast('⚠️ Mất kết nối mạng! Đang chạy ở chế độ ngoại tuyến (Offline). Tất cả dữ liệu nháp của bạn được bảo vệ an sau tại chỗ.', '#EA580C');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [triggerToast]);

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
        
        let loadedDepts = DEPARTMENTS;
        try {
          const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed.DEPARTMENTS) && parsed.DEPARTMENTS.length > 0) {
              loadedDepts = parsed.DEPARTMENTS;
            }
          }
        } catch (_) {}

        // Normalize and remove obsolete aliases like 'KKB SPK VIP'
        const cleanDepts = Array.from(new Set(loadedDepts.map(d => d === 'KKB SPK VIP' ? 'KKB sản phụ khoa VIP' : d)));
        if (!cleanDepts.includes("Khách")) {
          cleanDepts.push("Khách", "Khách (VIP/Khoa ngoài)");
        }
        setDepartments(cleanDepts);
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
          DEPARTMENTS: cleanDepts,
          updatedAt: new Date().toISOString()
        };
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload));
      } catch (e) {
        console.warn('API error, falling back to LocalStorage cache:', e);
        try {
          const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
          let loadedDepts = DEPARTMENTS;
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed.DV)) setItems(parsed.DV);
            if (parsed.DETAIL) setDetailAllocations(parsed.DETAIL);
            if (Array.isArray(parsed.USERS)) setUsers(parsed.USERS);
            if (Array.isArray(parsed.ACCOUNTS)) setAccounts(parsed.ACCOUNTS);
            if (Array.isArray(parsed.s12History)) setHistory(parsed.s12History);
            if (Array.isArray(parsed.wardDeliverySlips)) setWardDeliverySlips(parsed.wardDeliverySlips);
            if (Array.isArray(parsed.laundryDispatches)) setLaundryDispatches(parsed.laundryDispatches);
            if (Array.isArray(parsed.DEPARTMENTS) && parsed.DEPARTMENTS.length > 0) {
              loadedDepts = parsed.DEPARTMENTS;
            }
          } else {
            setItems(INITIAL_LINEN_ITEMS);
            setDetailAllocations(INITIAL_DETAIL_ALLOCATIONS);
            setUsers(INITIAL_USERS);
            setAccounts(INITIAL_ACCOUNTS);
            setWardDeliverySlips(INITIAL_WARD_DELIVERY_SLIPS);
            setLaundryDispatches(INITIAL_LAUNDRY_DISPATCHES);
          }
          const cleanDepts = Array.from(new Set(loadedDepts.map(d => d === 'KKB SPK VIP' ? 'KKB sản phụ khoa VIP' : d)));
          setRoles(INITIAL_ROLES);
          setDepartments(cleanDepts);
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
          if (newPerms.nhap !== false || newPerms.thuhoi !== true || newPerms.xuat !== false || newPerms.huy !== false || newPerms.dc !== false) {
            newPerms.nhap = false;
            newPerms.thuhoi = true;
            newPerms.xuat = false;
            newPerms.huy = false;
            newPerms.dc = false;
            changedRole = true;
          }
        } else if (nameLower.includes('nhân viên đồ vải') && !nameLower.includes('trưởng kho')) {
          if (newPerms.huy !== false) {
            newPerms.huy = false;
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

    // Async sync state to PostgreSQL / Neon DB
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
        let detailText = '';
        try {
          const parsed = JSON.parse(text);
          if (parsed.details && typeof parsed.details === 'string') {
            const cleanStr = parsed.details.replace(/\s+/g, ' ').trim();
            detailText = cleanStr.length > 80 ? `: ${cleanStr.slice(0, 80)}...` : `: ${cleanStr}`;
          }
        } catch (_) {}
        triggerToast(`⚠️ Đồng bộ máy chủ thất bại${detailText}`, '#EF4444');
      } else {
        const data = await res.json();
        if (data.isLocalOnly) {
          triggerToast('💾 Dữ liệu đã lưu tại trình duyệt (Chưa kết nối DB đám mây Neon)', '#F59E0B');
        } else {
          triggerToast('☁️ Đã cập nhật và đồng bộ dữ liệu lên cơ sở dữ liệu (Neon DB)', '#10B981');
        }
      }
    })
    .catch((err) => {
      console.error('Error during postgres sync:', err);
      triggerToast('⚠️ Không thể kết nối tới máy chủ đồng bộ đám mây', '#EF4444');
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
    let nextTempClean = { ...temporaryCleanStore };
    let nextTempDirty = { ...temporaryDirtyStore };
    let nextTempCompanyDirty = { ...temporaryCompanyDirtyStore };

    if (updatedItem.ma !== origMa) {
      nextDetail[updatedItem.ma] = nextDetail[origMa] || [];
      delete nextDetail[origMa];

      if (nextTempClean[origMa] !== undefined) {
        nextTempClean[updatedItem.ma] = nextTempClean[origMa];
        delete nextTempClean[origMa];
      }
      if (nextTempDirty[origMa] !== undefined) {
        nextTempDirty[updatedItem.ma] = nextTempDirty[origMa];
        delete nextTempDirty[origMa];
      }
      if (nextTempCompanyDirty[origMa] !== undefined) {
        nextTempCompanyDirty[updatedItem.ma] = nextTempCompanyDirty[origMa];
        delete nextTempCompanyDirty[origMa];
      }
    }
    saveAllStates(
      nextItems,
      nextDetail,
      roles,
      users,
      accounts,
      history,
      pendingRegs,
      departments,
      wardDeliverySlips,
      laundryDispatches,
      nextTempClean,
      nextTempDirty,
      nextTempCompanyDirty
    );
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
  }, currentWardName: string) => {
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
  }, isHousekeepingUser: boolean, currentWardName: string) => {
    if (isHousekeepingUser) {
      triggerToast('Tài khoản Hộ lý không có quyền tạo phiếu xuất nhập kho đồ vải.', '#EF4444');
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
  const handleConfirmXuat = (id: string, currentAccount: Account | null) => {
    let nextItems = [...items];
    let nextDetail = { ...detailAllocations };

    const nextHistory = history.map(h => {
      if (h.id === id && (h.type === 'xuat' || h.type === 'dc' || h.type === 'thuhoi') && h.status === 'pending_dept' && !h.movementApplied) {
        h.items.forEach(({ ma, qty }) => {
          if (h.type === 'xuat') {
            // Deduct Main store, add to Department allocation
            const itemIdx = nextItems.findIndex(i => i.ma === ma);
            if (itemIdx >= 0) {
              nextItems[itemIdx] = { ...nextItems[itemIdx], kc: Math.max(0, nextItems[itemIdx].kc - qty) };
            }

            const depts = nextDetail[ma] ? [...nextDetail[ma]] : [];
            const dIdx = depts.findIndex(d => d[0] === h.to);
            if (dIdx >= 0) {
              depts[dIdx] = [h.to, depts[dIdx][1] + qty];
            } else {
              depts.push([h.to, qty]);
            }
            nextDetail[ma] = depts.filter(d => d[1] > 0);
          } else if (h.type === 'dc') {
            // Move from department A (h.from) to department B (h.to)
            const depts = nextDetail[ma] ? [...nextDetail[ma]] : [];
            const sourceIdx = depts.findIndex(d => d[0] === h.from);
            if (sourceIdx >= 0) {
              depts[sourceIdx] = [h.from, Math.max(0, depts[sourceIdx][1] - qty)];
            }
            const targetIdx = depts.findIndex(d => d[0] === h.to);
            if (targetIdx >= 0) {
              depts[targetIdx] = [h.to, depts[targetIdx][1] + qty];
            } else {
              depts.push([h.to, qty]);
            }
            nextDetail[ma] = depts.filter(d => d[1] > 0);
          } else if (h.type === 'thuhoi') {
            // Deduct from department allocation, add to Main store
            const itemIdx = nextItems.findIndex(i => i.ma === ma);
            if (itemIdx >= 0) {
              nextItems[itemIdx] = { ...nextItems[itemIdx], kc: nextItems[itemIdx].kc + qty };
            }

            const depts = nextDetail[ma] ? [...nextDetail[ma]] : [];
            const dIdx = depts.findIndex(d => d[0] === h.from);
            if (dIdx >= 0) {
              depts[dIdx] = [h.from, Math.max(0, depts[dIdx][1] - qty)];
            }
            nextDetail[ma] = depts.filter(d => d[1] > 0);
          }
        });

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

    saveAllStates(nextItems, nextDetail, roles, users, accounts, nextHistory, pendingRegs);
    triggerToast(`Đã nhận bàn giao phiếu ${id} — Tồn kho đã cập nhật.`);
  };

  // Reject pending Xuất Kho
  const handleRejectXuat = (id: string, reason: string, currentAccount: Account | null) => {
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

  return {
    items,
    setItems,
    detailAllocations,
    setDetailAllocations,
    roles,
    setRoles,
    users,
    setUsers,
    accounts,
    setAccounts,
    history,
    setHistory,
    pendingRegs,
    setPendingRegs,
    departments,
    setDepartments,
    wardDeliverySlips,
    setWardDeliverySlips,
    laundryDispatches,
    setLaundryDispatches,
    temporaryCleanStore,
    setTemporaryCleanStore,
    temporaryDirtyStore,
    setTemporaryDirtyStore,
    temporaryCompanyDirtyStore,
    setTemporaryCompanyDirtyStore,
    isLoading,
    isOnline,
    isReadOnly,
    setIsReadOnly,
    activeTab,
    setActiveTab,
    mobileMenuOpen,
    setMobileMenuOpen,
    mobileTestBarOpen,
    setMobileTestBarOpen,
    allocationModal,
    setAllocationModal,
    saveAllStates,
    handleUpdateDepartments,
    handleRegisterSubmit,
    handleAddItem,
    handleEditItem,
    handleDeleteItem,
    handleDeleteTransaction,
    handleUpdateTransaction,
    handleSubmitTransaction,
    handleConfirmXuat,
    handleRejectXuat,
    handleCompleteDeliveryCycle,
    handleImportBackup,
    handleExportBackup,
    handleInitTestStock,
    handleGenerateReportTestData,
    handleClearReportTestData,
    hasSimulatedData
  };
}
