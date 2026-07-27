import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  LinenItem, 
  WardDeliverySlip, 
  LaundryDispatch, 
  Account, 
  User, 
  Role 
} from '../../../types';
import { 
  FileText, 
  PlusCircle, 
  Sparkles, 
  Search, 
  X, 
  Check,
  Printer,
  Camera,
  Image as ImageIcon,
  Bed,
  RefreshCw,
  Trash2,
  CheckCircle2,
  Edit3
} from 'lucide-react';
import { checkPermission } from '../utils/checkPermission';
import M1WardSlipsList from './ward/M1WardSlipsList';
import M1WardEditSlipView from './ward/M1WardEditSlipView';
import M1WardSlipDetailView from './ward/M1WardSlipDetailView';
import M1WardCreateSlipModal from './ward/M1WardCreateSlipModal';
import PrintBillModal, { PrintBillData } from '../utils/PrintBillModal';

interface M1WardTabProps {
  items: LinenItem[];
  detailAllocations: Record<string, [string, number][]>;
  currentAccount: Account | null;
  currentWardName: string;
  users: User[];
  roles: Role[];
  departments: string[];
  wardDeliverySlips: WardDeliverySlip[];
  laundryDispatches: LaundryDispatch[];
  temporaryDirtyStore: Record<string, number>;
  temporaryCleanStore: Record<string, number>;
  simulatedRole: 'ward' | 'orderly' | 'housekeeping' | 'linen' | 'laundry' | 'clean' | 'all' | 'admin';
  isOrderlyUser: boolean;
  isHousekeepingUser: boolean;
  effectiveIsWardUser: boolean;
  effectiveIsLaundryUser: boolean;
  hasLinenPerm: boolean;
  currentRoleName: string;
  onUpdateDeliveryStates: (params: {
    wardSlips?: WardDeliverySlip[];
    laundryDispatches?: LaundryDispatch[];
    temporaryCleanStore?: Record<string, number>;
    temporaryDirtyStore?: Record<string, number>;
    temporaryCompanyDirtyStore?: Record<string, number>;
    clearHistory?: boolean;
  }) => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  activeSlipId: string | null;
  setActiveSlipId: (id: string | null) => void;
  deptsToUse: string[];
}

export default function M1WardTab({
  items,
  detailAllocations,
  currentAccount,
  currentWardName,
  users,
  roles,
  departments,
  wardDeliverySlips,
  laundryDispatches,
  temporaryDirtyStore,
  temporaryCleanStore,
  simulatedRole,
  isOrderlyUser,
  isHousekeepingUser,
  effectiveIsWardUser,
  effectiveIsLaundryUser,
  hasLinenPerm,
  currentRoleName,
  onUpdateDeliveryStates,
  showToast,
  activeSlipId,
  setActiveSlipId,
  deptsToUse
}: M1WardTabProps) {
  const hasPerm = (roleReq: 'ward' | 'linen' | 'laundry' | 'clean' | 'housekeeping') => {
    return checkPermission(
      roleReq,
      simulatedRole,
      currentAccount,
      effectiveIsLaundryUser,
      isOrderlyUser,
      isHousekeepingUser,
      effectiveIsWardUser,
      currentRoleName,
      hasLinenPerm
    );
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [filterDept, setFilterDept] = useState('Tất cả');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Draft editing states
  const [editingSlipId, setEditingSlipId] = useState<string | null>(null);
  const [editDept, setEditDept] = useState('');
  const [editCreator, setEditCreator] = useState('');
  const [editItemsList, setEditItemsList] = useState<Array<{ ma: string; ten: string; group: string; qty: number; isInfectious: boolean; isCustom?: boolean }>>([]);
  const [editAddLinenMa, setEditAddLinenMa] = useState('');
  const [editAddLinenQty, setEditAddLinenQty] = useState(1);
  const [editAddLinenInfectious, setEditAddLinenInfectious] = useState(false);

  // Checking dirty verification states
  const [m1CheckedItems, setM1CheckedItems] = useState<Record<string, boolean>>({});
  const [m1ItemVerifiedQtys, setM1ItemVerifiedQtys] = useState<Record<string, number>>({});
  const [isConfirmingM1, setIsConfirmingM1] = useState(false);

  // Draft states for creating new slip
  const [isCreatingSlip, setIsCreatingSlip] = useState(false);
  const [draftIsRewash, setDraftIsRewash] = useState(false);
  const [selectedDept, setSelectedDept] = useState('');
  const [slipCreator, setSlipCreator] = useState('');
  const [draftItems, setDraftItems] = useState<Array<{ ma: string; ten: string; group: string; qty: number; isInfectious: boolean; maxAlloc: number; isCustom?: boolean }>>([]);
  const [customName, setCustomName] = useState('');
  const [customQty, setCustomQty] = useState(1);
  const [customInfectious, setCustomInfectious] = useState(false);
  const [draftAttachedImage, setDraftAttachedImage] = useState<string | undefined>(undefined);
  const [draftGuestName, setDraftGuestName] = useState('');
  const [draftGuestRoom, setDraftGuestRoom] = useState('');

  const detailSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if ((activeSlipId || isCreatingSlip || editingSlipId) && detailSectionRef.current) {
      detailSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [activeSlipId, isCreatingSlip, editingSlipId]);

  // Filtered lists
  const filteredSlips = useMemo(() => {
    let result = [...wardDeliverySlips];
    
    // Role restrictions
    if (isOrderlyUser || isHousekeepingUser) {
      result = result.filter(s => s.dept === currentWardName);
    } else if (effectiveIsWardUser && !currentAccount?.isAdmin && simulatedRole === 'all') {
      result = result.filter(s => s.dept === currentWardName);
    }

    if (filterDept !== 'Tất cả') {
      result = result.filter(s => s.dept === filterDept);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s => 
        s.id.toLowerCase().includes(q) || 
        s.createdAt.toLowerCase().includes(q) || 
        s.dept.toLowerCase().includes(q) ||
        s.createdBy.toLowerCase().includes(q)
      );
    }

    return result;
  }, [wardDeliverySlips, isOrderlyUser, isHousekeepingUser, effectiveIsWardUser, currentWardName, currentAccount, simulatedRole, filterDept, searchQuery]);

  const activeSlip = useMemo(() => {
    return wardDeliverySlips.find(s => s.id === activeSlipId) || null;
  }, [wardDeliverySlips, activeSlipId]);

  // Create Random Dirty Slip
  const handleCreateRandomDirtySlip = () => {
    const validDepts = departments.filter(dept => {
      return items.some(item => {
        const alloc = (detailAllocations[item.ma] || []).find(([d]) => d === dept);
        return alloc && alloc[1] > 0;
      });
    }).filter(d => d !== 'Khách' && d !== 'Kho trung tâm' && d !== 'Tất cả');

    if (validDepts.length === 0) return;
    const randomDept = validDepts[Math.floor(Math.random() * validDepts.length)];

    const deptItems = items.filter(item => {
      const alloc = (detailAllocations[item.ma] || []).find(([d]) => d === randomDept);
      return alloc && alloc[1] > 0;
    });

    const slipItems = deptItems.slice(0, 3 + Math.floor(Math.random() * 3)).map(item => {
      const alloc = (detailAllocations[item.ma] || []).find(([d]) => d === randomDept);
      const maxAlloc = alloc ? alloc[1] : 5;
      const qty = 1 + Math.floor(Math.random() * Math.min(maxAlloc, 5));
      return {
        ma: item.ma,
        ten: item.ten,
        group: item.nhom,
        qty,
        isInfectious: Math.random() < 0.15,
        isVerifiedDirty: false,
        verifiedDirtyQty: qty,
        isLaundryReceived: false,
        laundryReceivedQty: qty,
        cleanReturnedQty: qty,
        isCleanReturnedVerified: false,
        isHospitalCleanVerified: false,
        hospitalCleanQty: qty
      };
    });

    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yy = String(now.getFullYear()).slice(-2);
    const datePrefix = `PGN-${dd}${mm}${yy}`;

    let maxSeq = 0;
    wardDeliverySlips.forEach(s => {
      if (s.id.startsWith(datePrefix)) {
        const seqStr = s.id.slice(datePrefix.length);
        const seqNum = parseInt(seqStr, 10);
        if (!isNaN(seqNum) && seqNum > maxSeq) maxSeq = seqNum;
      }
    });
    const nextSeq = String(maxSeq + 1).padStart(2, '0');
    const newSlipId = `${datePrefix}${nextSeq}`;

    const newSlip: WardDeliverySlip = {
      id: newSlipId,
      dept: randomDept,
      createdAt: now.toLocaleString('vi-VN'),
      createdBy: `Hệ thống (Simulated)`,
      status: 'pending',
      items: slipItems
    };

    onUpdateDeliveryStates({
      wardSlips: [newSlip, ...wardDeliverySlips]
    });
    setActiveSlipId(newSlipId);
    showToast(`✨ Tạo thành công phiếu dơ mới random cho khoa ${randomDept}!`, 'success');
  };

  // Open Create Slip Modal
  const handleOpenCreateSlip = () => {
    localStorage.removeItem('linen_draft_slip_data');
    setCustomName('');
    setCustomQty(1);
    setCustomInfectious(false);
    setDraftIsRewash(false);

    const defaultDept = isHousekeepingUser
      ? 'Khách'
      : (currentWardName && currentWardName !== 'Tất cả' && currentWardName !== 'Kho trung tâm'
        ? currentWardName
        : deptsToUse[0] || 'NICU');

    setDraftAttachedImage(undefined);
    setDraftGuestName('');
    setDraftGuestRoom('');

    if (defaultDept.startsWith('Khách')) {
      const customRows = [
        { ma: `CUST-G1-${Date.now()}`, ten: '', group: 'Quần áo khách / ngoài danh mục', qty: 0, isInfectious: false, maxAlloc: 0, isCustom: true },
        { ma: `CUST-G2-${Date.now()}`, ten: '', group: 'Quần áo khách / ngoài danh mục', qty: 0, isInfectious: false, maxAlloc: 0, isCustom: true },
        { ma: `CUST-G3-${Date.now()}`, ten: '', group: 'Quần áo khách / ngoài danh mục', qty: 0, isInfectious: false, maxAlloc: 0, isCustom: true },
      ];
      setDraftItems(customRows);
      setSelectedDept(defaultDept);
      setSlipCreator(currentAccount?.name || 'NV Buồng phòng');
      setIsCreatingSlip(true);
      return;
    }

    const initialStandards = items.filter(item => {
      const allocTuple = (detailAllocations[item.ma] || []).find(([d]) => d === defaultDept);
      return allocTuple && allocTuple[1] > 0;
    }).map(item => {
      const allocTuple = (detailAllocations[item.ma] || []).find(([d]) => d === defaultDept);
      const maxAlloc = allocTuple ? allocTuple[1] : 0;
      return {
        ma: item.ma,
        ten: item.ten,
        group: item.nhom,
        qty: 0,
        isInfectious: false,
        maxAlloc: maxAlloc
      };
    });

    let finalStandards = initialStandards;
    if (initialStandards.length === 0) {
      finalStandards = items.map(item => ({
        ma: item.ma,
        ten: item.ten,
        group: item.nhom,
        qty: 0,
        isInfectious: false,
        maxAlloc: 0
      }));
    }

    setDraftItems(finalStandards);
    setSelectedDept(defaultDept);
    setSlipCreator(currentAccount?.name || (hasPerm('linen') ? 'NV Kho đồ vải BV' : (isOrderlyUser ? `Hộ lý (${defaultDept})` : `Điều dưỡng (${defaultDept})`)));
    setIsCreatingSlip(true);
  };

  const handleDeptChange = (newDept: string) => {
    setSelectedDept(newDept);
    if (!hasPerm('linen') && !currentAccount?.isAdmin) {
      setSlipCreator(currentAccount?.name || (isOrderlyUser ? `Hộ lý (${newDept})` : (newDept.startsWith('Khách') ? 'NV Buồng phòng' : `Điều dưỡng (${newDept})`)));
    }
    
    if (newDept.startsWith('Khách')) {
      const customItems = draftItems.filter(i => i.isCustom);
      if (customItems.length === 0) {
        setDraftItems([
          { ma: `CUST-G1-${Date.now()}`, ten: '', group: 'Quần áo khách / ngoài danh mục', qty: 0, isInfectious: false, maxAlloc: 0, isCustom: true },
          { ma: `CUST-G2-${Date.now()}`, ten: '', group: 'Quần áo khách / ngoài danh mục', qty: 0, isInfectious: false, maxAlloc: 0, isCustom: true },
          { ma: `CUST-G3-${Date.now()}`, ten: '', group: 'Quần áo khách / ngoài danh mục', qty: 0, isInfectious: false, maxAlloc: 0, isCustom: true },
        ]);
      } else {
        setDraftItems(customItems);
      }
      return;
    }

    const newStandards = items.filter(item => {
      const allocTuple = (detailAllocations[item.ma] || []).find(([d]) => d === newDept);
      return allocTuple && allocTuple[1] > 0;
    }).map(item => {
      const allocTuple = (detailAllocations[item.ma] || []).find(([d]) => d === newDept);
      const maxAlloc = allocTuple ? allocTuple[1] : 0;
      
      const existing = draftItems.find(i => i.ma === item.ma);
      return {
        ma: item.ma,
        ten: item.ten,
        group: item.nhom,
        qty: existing ? existing.qty : 0,
        isInfectious: existing ? existing.isInfectious : false,
        maxAlloc: maxAlloc
      };
    });

    let finalStandards = newStandards;
    if (newStandards.length === 0) {
      finalStandards = items.map(item => {
        const existing = draftItems.find(i => i.ma === item.ma);
        return {
          ma: item.ma,
          ten: item.ten,
          group: item.nhom,
          qty: existing ? existing.qty : 0,
          isInfectious: existing ? existing.isInfectious : false,
          maxAlloc: 0
        };
      });
    }

    setDraftItems(finalStandards);
  };

  const handleAddCustomDraftFromTable = () => {
    if (!customName.trim()) {
      showToast('⚠️ Vui lòng nhập tên đồ vải ngoài danh mục.', 'error');
      return;
    }
    const newCustom = {
      ma: `CUST-${Date.now()}`,
      ten: customName.trim(),
      group: "Đồ ngoài danh mục",
      qty: Math.max(1, customQty),
      isInfectious: customInfectious,
      maxAlloc: 0,
      isCustom: true
    };
    setDraftItems(prev => [...prev, newCustom]);
    setCustomName('');
    setCustomQty(1);
    setCustomInfectious(false);
    showToast(`✓ Đã thêm "${newCustom.ten}" vào phiếu dơ thành công!`, 'success');
  };

  const handleRemoveDraftItem = (ma: string) => {
    setDraftItems(prev => prev.filter(i => i.ma !== ma));
  };

  const handleSubmitSlip = () => {
    const filledItems = draftItems.filter(i => i.qty > 0 && (!i.isCustom || i.ten.trim().length > 0));
    if (filledItems.length === 0) {
      showToast('Vui lòng nhập số lượng > 0 cho ít nhất một mặt hàng (nếu là đồ tự đánh chữ vui lòng nhập tên).', 'error');
      return;
    }

    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yy = String(now.getFullYear()).slice(-2);
    const datePrefix = `PGN-${dd}${mm}${yy}`;

    let maxSeq = 0;
    wardDeliverySlips.forEach(s => {
      if (s.id.startsWith(datePrefix)) {
        const seqStr = s.id.slice(datePrefix.length);
        const seqNum = parseInt(seqStr, 10);
        if (!isNaN(seqNum) && seqNum > maxSeq) maxSeq = seqNum;
      }
    });
    const nextSeq = String(maxSeq + 1).padStart(2, '0');
    const newSlipId = `${datePrefix}${nextSeq}`;

    if (draftIsRewash) {
      const overStockItems: string[] = [];
      filledItems.forEach(item => {
        const availableClean = temporaryCleanStore[item.ma] || 0;
        if (item.qty > availableClean) {
          overStockItems.push(`${item.ten} (Yêu cầu giặt lại: ${item.qty}, Kho sạch hiện có: ${availableClean})`);
        }
      });
      if (overStockItems.length > 0) {
        showToast(`⚠️ Không đủ đồ sạch trong Kho Sạch Tạm để gửi giặt lại:\n${overStockItems.join('\n')}\nVui lòng giảm số lượng yêu cầu giặt lại!`, 'error');
        return;
      }
    }

    const newSlip: WardDeliverySlip = {
      id: newSlipId,
      dept: selectedDept,
      createdAt: new Date().toLocaleString('vi-VN'),
      createdBy: slipCreator,
      status: 'pending',
      isGuestSlip: selectedDept.startsWith('Khách'),
      isRewash: draftIsRewash,
      attachedImage: draftAttachedImage,
      guestName: draftGuestName.trim() || undefined,
      guestRoom: draftGuestRoom.trim() || undefined,
      items: filledItems.map(item => ({
        ...item,
        isVerifiedDirty: false,
        verifiedDirtyQty: item.qty,
        isLaundryReceived: false,
        laundryReceivedQty: item.qty,
        cleanReturnedQty: item.qty,
        isCleanReturnedVerified: false,
        isHospitalCleanVerified: false,
        hospitalCleanQty: item.qty
      }))
    };

    onUpdateDeliveryStates({
      wardSlips: [newSlip, ...wardDeliverySlips]
    });
    setIsCreatingSlip(false);
    setActiveSlipId(newSlipId);
    localStorage.removeItem('linen_draft_slip_data');
    showToast(`✓ Đã gửi phiếu giao đồ dơ ${newSlipId} thành công!`, 'success');
  };

  const handleUploadDraftImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('⚠️ Vui lòng chọn tệp hình ảnh (JPG, PNG, WEBP...)', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 1000;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
        }
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setDraftAttachedImage(dataUrl);
        showToast('Đã đính kèm hình ảnh đồ khách thành công!', 'success');
      };
      img.onerror = () => {
        showToast('Không thể đọc tệp hình ảnh này', 'error');
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleInsertDraftDemoImage = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(0, 0, 400, 300);
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 4;
      ctx.strokeRect(10, 10, 380, 280);
      
      ctx.fillStyle = '#78350f';
      ctx.font = 'bold 20px serif';
      ctx.fillText('ẢNH CHỤP ĐỒ KHÁCH VIP', 60, 60);
      ctx.fillStyle = '#92400e';
      ctx.font = '13px sans-serif';
      ctx.fillText('Đang kiểm tra bàn giao xe giặt', 40, 100);
      ctx.fillText('(Ghi nhận mẫu đồ thêu tay riêng biệt)', 40, 120);
      
      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(30, 140);
      ctx.lineTo(370, 140);
      ctx.stroke();
      
      ctx.fillStyle = '#000000';
      ctx.font = '16px monospace';
      ctx.fillText(`Khách: ${draftGuestName || 'Nguyễn Văn VIP'}`, 40, 160);
      ctx.fillText(`Phòng: ${draftGuestRoom || 'VIP 502'}`, 40, 190);
      ctx.fillText(`Thời gian: ${new Date().toLocaleTimeString('vi-VN')}`, 40, 220);
    }
    setDraftAttachedImage(canvas.toDataURL('image/jpeg', 0.8));
    showToast('Đã chèn ảnh chụp mẫu thành công!', 'success');
  };

  // Editing a slip methods
  const handleStartEditSlip = (slip: WardDeliverySlip) => {
    setEditingSlipId(slip.id);
    setEditDept(slip.dept);
    setEditCreator(slip.createdBy);
    setEditItemsList(slip.items.map(it => ({
      ma: it.ma,
      ten: it.ten,
      group: it.group || 'Đồ ngoài danh mục',
      qty: it.qty,
      isInfectious: it.isInfectious,
      isCustom: it.isCustom
    })));
    setEditAddLinenMa('');
    setEditAddLinenQty(1);
    setEditAddLinenInfectious(false);
  };

  const handleCancelEditSlip = () => {
    setEditingSlipId(null);
  };

  const handleUpdateEditItemQtyDirect = (ma: string, val: number) => {
    setEditItemsList(prev => prev.map(item => {
      if (item.ma === ma) return { ...item, qty: val };
      return item;
    }));
  };

  const handleUpdateEditItemTenDirect = (ma: string, val: string) => {
    setEditItemsList(prev => prev.map(item => {
      if (item.ma === ma) return { ...item, ten: val };
      return item;
    }));
  };

  const handleToggleEditItemInfectiousDirect = (ma: string) => {
    setEditItemsList(prev => prev.map(item => {
      if (item.ma === ma) return { ...item, isInfectious: !item.isInfectious };
      return item;
    }));
  };

  const handleRemoveItemFromEditList = (ma: string) => {
    setEditItemsList(prev => prev.filter(item => item.ma !== ma));
  };

  const handleAddItemToEditList = () => {
    if (!editAddLinenMa) {
      showToast('⚠️ Vui lòng chọn một loại đồ vải.', 'error');
      return;
    }
    const exists = editItemsList.find(it => it.ma === editAddLinenMa);
    if (exists) {
      showToast('⚠️ Mặt hàng này đã tồn tại trong phiếu, bạn có thể điều chỉnh số lượng của nó!', 'error');
      return;
    }
    const itemObj = items.find(i => i.ma === editAddLinenMa);
    if (!itemObj) return;

    setEditItemsList(prev => [...prev, {
      ma: editAddLinenMa,
      ten: itemObj.ten,
      group: itemObj.nhom,
      qty: editAddLinenQty,
      isInfectious: editAddLinenInfectious,
      isCustom: false
    }]);
    setEditAddLinenMa('');
    setEditAddLinenQty(1);
    setEditAddLinenInfectious(false);
    showToast('✓ Đã thêm vào danh sách đồ vải thành công!', 'success');
  };

  const handleAddCustomToEditList = () => {
    const customRow = {
      ma: `CUST-EDIT-${Date.now()}`,
      ten: '',
      group: 'Quần áo khách / ngoài danh mục',
      qty: 1,
      isInfectious: false,
      isCustom: true
    };
    setEditItemsList(prev => [...prev, customRow]);
  };

  const handleSaveEditSlip = () => {
    const validItems = editItemsList.filter(item => item.qty > 0 && (!item.isCustom || item.ten.trim().length > 0));
    if (validItems.length === 0) {
      showToast('⚠️ Phiếu dơ phải chứa ít nhất 1 mặt hàng có số lượng > 0.', 'error');
      return;
    }

    const updatedSlips = wardDeliverySlips.map(s => {
      if (s.id === editingSlipId) {
        return {
          ...s,
          dept: editDept,
          createdBy: editCreator,
          items: validItems.map(item => {
            const originalItem = s.items.find(o => o.ma === item.ma);
            return {
              ...originalItem,
              ma: item.ma,
              ten: item.ten,
              group: item.group,
              qty: item.qty,
              isInfectious: item.isInfectious,
              isCustom: item.isCustom,
              verifiedDirtyQty: originalItem?.isVerifiedDirty ? (originalItem.verifiedDirtyQty ?? item.qty) : item.qty,
              laundryReceivedQty: item.qty,
              cleanReturnedQty: item.qty,
              hospitalCleanQty: item.qty
            };
          })
        };
      }
      return s;
    });

    onUpdateDeliveryStates({
      wardSlips: updatedSlips
    });
    setEditingSlipId(null);
    showToast('✓ Đã lưu chỉnh sửa phiếu dơ thành công!', 'success');
  };

  const handleDeletePendingSlip = (slipId: string) => {
    const updatedSlips = wardDeliverySlips.filter(s => s.id !== slipId);
    onUpdateDeliveryStates({
      wardSlips: updatedSlips
    });
    if (activeSlipId === slipId) setActiveSlipId(null);
    showToast(`🗑️ Đã xóa thành công phiếu dơ ${slipId}!`, 'success');
  };

  // Section 1: Confirm dirty slip and move garments into Temporary Dirty Store
  const handleConfirmDirtyLinenM1 = (slipId: string) => {
    if (isConfirmingM1) return;

    const targetSlip = wardDeliverySlips.find(s => s.id === slipId);
    if (!targetSlip) return;

    if (targetSlip.status !== 'pending') {
      showToast('⚠️ Phiếu này đã được duyệt dơ rồi, không thể duyệt lại!', 'error');
      return;
    }

    // Check if ALL items have been ticked/checked
    const uncheckedItem = targetSlip.items.find(it => !m1CheckedItems[it.ma]);
    if (uncheckedItem) {
      showToast(`Vui lòng kiểm đếm và tích xác nhận cho mặt hàng: "${uncheckedItem.ten}"`, 'error');
      return;
    }

    setIsConfirmingM1(true);

    const isGuest = targetSlip.isGuestSlip || targetSlip.dept.startsWith('Khách');
    if (isGuest) {
      const guestBillId = `BILL-KHACH-${Date.now().toString().slice(-4)}`;
      const guestDispatch: LaundryDispatch = {
        id: guestBillId,
        createdAt: new Date().toLocaleString('vi-VN'),
        contractor: 'Công ty Giặt ủi Thành Đô (Bill Riêng Khách VIP)',
        driver: 'Nguyễn Văn Hùng (Chuyên chở đồ VIP)',
        plate: '29C-888.88',
        status: 'pending_laundry',
        linkedSlipIds: [slipId],
        isGuestBill: true,
        attachedImage: targetSlip.attachedImage,
        guestName: targetSlip.guestName,
        guestRoom: targetSlip.guestRoom,
        dept: targetSlip.dept,
        items: targetSlip.items.map(item => {
          const qty = m1ItemVerifiedQtys[item.ma] !== undefined ? m1ItemVerifiedQtys[item.ma] : (item.verifiedDirtyQty ?? item.qty);
          return {
            ma: item.ma,
            ten: item.ten,
            group: item.group || 'Đồ ngoài danh mục',
            isCustom: item.isCustom || true,
            wardQty: qty,
            handoverQty: qty,
            isHandoverChecked: false,
            handoverNote: '',
            laundryReceivedQty: qty,
            isLaundryChecked: false,
            cleanReturnedQty: qty,
            isCleanChecked: false,
            cleanNote: ''
          };
        })
      };

      const updatedSlipsGuest = wardDeliverySlips.map(slip => {
        if (slip.id === slipId) {
          const updatedItems = slip.items.map(item => ({
            ...item,
            isVerifiedDirty: true,
            verifiedDirtyQty: m1ItemVerifiedQtys[item.ma] !== undefined ? m1ItemVerifiedQtys[item.ma] : (item.verifiedDirtyQty ?? item.qty)
          }));
          return {
            ...slip,
            status: 'laundry_received' as const,
            laundryDispatchId: guestBillId,
            laundryReceivedBy: currentAccount?.name || 'Nhân viên đồ vải',
            laundryReceivedAt: new Date().toLocaleString('vi-VN'),
            items: updatedItems,
            confirmedBy: currentAccount?.name || 'Nhân viên đồ vải',
            confirmedAt: new Date().toLocaleString('vi-VN'),
            verifiedDirtyBy: currentAccount?.name || 'Nhân viên đồ vải',
            verifiedDirtyAt: new Date().toLocaleString('vi-VN')
          };
        }
        return slip;
      });

      onUpdateDeliveryStates({
        wardSlips: updatedSlipsGuest,
        laundryDispatches: [guestDispatch, ...laundryDispatches]
      });
      setIsConfirmingM1(false);
      showToast(`🚀 Đã duyệt phiếu Khách và tự động tạo Bill Riêng (${guestBillId}) chuyển sang Xưởng giặt!`, 'success');
      return;
    }

    const updatedSlips = wardDeliverySlips.map(slip => {
      if (slip.id === slipId) {
        const updatedItems = slip.items.map(item => ({
          ...item,
          isVerifiedDirty: true,
          verifiedDirtyQty: m1ItemVerifiedQtys[item.ma] !== undefined ? m1ItemVerifiedQtys[item.ma] : (item.verifiedDirtyQty ?? item.qty)
        }));
        return {
          ...slip,
          status: 'verified_dirty' as const,
          items: updatedItems,
          confirmedBy: currentAccount?.name || 'Nhân viên đồ vải',
          confirmedAt: new Date().toLocaleString('vi-VN'),
          verifiedDirtyBy: currentAccount?.name || 'Nhân viên đồ vải',
          verifiedDirtyAt: new Date().toLocaleString('vi-VN')
        };
      }
      return slip;
    });

    const nextDirtyStore = { ...temporaryDirtyStore };
    const nextCleanStore = { ...temporaryCleanStore };

    if (targetSlip.isRewash) {
      targetSlip.items.forEach(item => {
        const qty = m1ItemVerifiedQtys[item.ma] !== undefined ? m1ItemVerifiedQtys[item.ma] : (item.verifiedDirtyQty ?? item.qty);
        nextCleanStore[item.ma] = Math.max(0, (nextCleanStore[item.ma] || 0) - qty);
        nextDirtyStore[item.ma] = (nextDirtyStore[item.ma] || 0) + qty;
      });
    } else {
      targetSlip.items.forEach(item => {
        const qty = m1ItemVerifiedQtys[item.ma] !== undefined ? m1ItemVerifiedQtys[item.ma] : (item.verifiedDirtyQty ?? item.qty);
        nextDirtyStore[item.ma] = (nextDirtyStore[item.ma] || 0) + qty;
      });
    }

    onUpdateDeliveryStates({
      wardSlips: updatedSlips,
      temporaryDirtyStore: nextDirtyStore,
      temporaryCleanStore: nextCleanStore
    });
    
    setIsConfirmingM1(false);
    if (targetSlip.isRewash) {
      showToast(`🔄 Đã duyệt phiếu Giặt Lại ${slipId}! Đã trừ Kho Sạch và chuyển đồ dơ vào "Kho đồ dơ" để giặt lại.`, 'success');
    } else {
      showToast(`✓ Đã xác nhận phiếu dơ ${slipId}! Đồ dơ đã đi vào "Kho dơ tạm" bệnh viện.`, 'success');
    }
  };

  const handleCreateGuestBillRiêng = (targetSlip: WardDeliverySlip) => {
    const guestBillId = `BILL-KHACH-${Date.now().toString().slice(-4)}`;
    const guestDispatch: LaundryDispatch = {
      id: guestBillId,
      createdAt: new Date().toLocaleString('vi-VN'),
      contractor: 'Công ty Giặt ủi Thành Đô (Bill Riêng Khách VIP)',
      driver: 'Nguyễn Văn Hùng (Chuyên chở đồ VIP)',
      plate: '29C-888.88',
      status: 'pending_laundry',
      linkedSlipIds: [targetSlip.id],
      isGuestBill: true,
      attachedImage: targetSlip.attachedImage,
      guestName: targetSlip.guestName,
      guestRoom: targetSlip.guestRoom,
      dept: targetSlip.dept,
      items: targetSlip.items.map(item => ({
        ma: item.ma,
        ten: item.ten,
        group: item.group || 'Đồ ngoài danh mục',
        isCustom: item.isCustom || true,
        wardQty: item.verifiedDirtyQty ?? item.qty,
        handoverQty: item.verifiedDirtyQty ?? item.qty,
        isHandoverChecked: false,
        handoverNote: '',
        laundryReceivedQty: item.verifiedDirtyQty ?? item.qty,
        isLaundryChecked: false,
        cleanReturnedQty: item.verifiedDirtyQty ?? item.qty,
        isCleanChecked: false,
        cleanNote: ''
      }))
    };

    const updatedSlipsGuest = wardDeliverySlips.map(slip => {
      if (slip.id === targetSlip.id) {
        return {
          ...slip,
          status: 'laundry_received' as const,
          laundryDispatchId: guestBillId,
          laundryReceivedBy: currentAccount?.name || 'Nhân viên đồ vải',
          laundryReceivedAt: new Date().toLocaleString('vi-VN')
        };
      }
      return slip;
    });

    onUpdateDeliveryStates({
      wardSlips: updatedSlipsGuest,
      laundryDispatches: [guestDispatch, ...laundryDispatches]
    });
    showToast(`🚀 Đã tạo Bill Riêng (${guestBillId}) cho phiếu Khách ${targetSlip.id}!`, 'success');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in w-full">
      {/* Slips List */}
      <div className="lg:col-span-5 space-y-4">
        <div className="border border-stone-300 bg-white rounded-xl shadow-sm p-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
            <h3 className="text-sm font-bold text-stone-800 uppercase">Danh sách phiếu giao dơ</h3>
            <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto justify-start sm:justify-end">
              {currentAccount?.isAdmin && (
                <button
                  onClick={handleCreateRandomDirtySlip}
                  className="px-2.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold uppercase rounded-lg shadow flex items-center gap-1 transition-all"
                  title="Tạo tự động 1 phiếu dơ ngẫu nhiên của khoa phòng bất kì từ tồn kho"
                >
                  <Sparkles size={12} />
                  Tạo phiếu dơ random
                </button>
              )}
              {hasPerm('ward') && (
                <button
                  onClick={handleOpenCreateSlip}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold uppercase rounded-lg shadow flex items-center gap-1"
                >
                  <PlusCircle size={12} />
                  Tạo phiếu dơ
                </button>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2 mb-3">
            <div className="flex items-center gap-1.5 bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5 flex-1 shadow-2xs">
              <Search size={14} className="text-stone-400 shrink-0" />
              <input
                type="text"
                placeholder="Tìm mã phiếu, ngày, khoa..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-xs text-stone-800 focus:outline-none"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-stone-400 hover:text-stone-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {(!effectiveIsWardUser || isOrderlyUser) && (
              <select
                value={filterDept}
                onChange={e => setFilterDept(e.target.value)}
                className="bg-stone-50 border border-stone-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer max-w-full sm:max-w-[150px]"
              >
                <option value="Tất cả">Tất cả khoa</option>
                {deptsToUse.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            )}
          </div>

          {/* Slips mapping */}
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {filteredSlips.map(slip => {
              const isPending = slip.status === 'pending';
              return (
                <div
                  key={slip.id}
                  onClick={() => {
                    setActiveSlipId(slip.id);
                    // Reset checkbox verify states
                    const initChecked: Record<string, boolean> = {};
                    const initVerified: Record<string, number> = {};
                    slip.items.forEach(it => {
                      initChecked[it.ma] = false;
                      initVerified[it.ma] = it.verifiedDirtyQty ?? it.qty;
                    });
                    setM1CheckedItems(initChecked);
                    setM1ItemVerifiedQtys(initVerified);
                  }}
                  className={`p-3 border rounded-xl cursor-pointer transition-all ${
                    activeSlipId === slip.id 
                      ? 'bg-blue-50/70 border-blue-500 shadow-sm' 
                      : 'border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-black text-stone-900">{slip.id}</span>
                        {slip.isRewash && (
                          <span className="bg-amber-100 text-amber-800 border border-amber-200 text-[8px] font-bold px-1 rounded-sm uppercase tracking-wide">
                            🔄 Giặt lại
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-stone-500 block">{slip.dept} • {slip.createdAt}</span>
                    </div>
                    <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-md ${
                      isPending ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {isPending ? 'Chờ duyệt' : 'Đã duyệt'}
                    </span>
                  </div>
                  <div className="mt-2.5 flex justify-between items-center border-t border-stone-100 pt-2">
                    <span className="text-[10px] text-stone-600 font-medium">
                      Khai báo: {slip.items.reduce((s, i) => s + i.qty, 0)} cái đồ vải
                    </span>
                    {isPending && (hasPerm('ward') || hasPerm('linen')) && (
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => {
                            setActiveSlipId(slip.id);
                            handleStartEditSlip(slip);
                          }}
                          className="px-1.5 py-0.5 text-[9px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold border border-indigo-200 rounded transition-all"
                          title="Sửa nhanh phiếu"
                        >
                          ✏️ Sửa
                        </button>
                        <button
                          onClick={() => handleDeletePendingSlip(slip.id)}
                          className="px-1.5 py-0.5 text-[9px] bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold border border-rose-200 rounded transition-all"
                          title="Xóa nhanh phiếu"
                        >
                          🗑️ Xóa
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {filteredSlips.length === 0 && (
              <div className="text-center py-8 text-xs text-stone-400">Không tìm thấy phiếu nào.</div>
            )}
          </div>
        </div>
      </div>

      {/* Slip Workspace */}
      <div ref={detailSectionRef} className="lg:col-span-7 scroll-mt-6">
        {activeSlip ? (
          editingSlipId === activeSlip.id ? (
            /* EDITING MODE FOR PENDING SLIP */
            <div className="border-2 border-indigo-500 bg-white rounded-xl shadow-lg p-5 space-y-4 relative overflow-hidden animate-fade-in">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-blue-500"></div>
              <div className="flex justify-between items-center pb-3 border-b border-stone-200">
                <div>
                  <h2 className="text-sm font-bold text-indigo-950 uppercase flex items-center gap-1.5">
                    ✏️ ĐANG CHỈNH SỬA PHIẾU {activeSlip.id}
                  </h2>
                  <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-1.5 py-0.5 rounded uppercase mt-0.5 inline-block">Chế độ sửa</span>
                </div>
                <button onClick={handleCancelEditSlip} className="text-stone-400 hover:text-stone-900"><X size={16} /></button>
              </div>

              {/* Metadata fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-stone-50 p-3 rounded-lg border border-stone-200">
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-wider text-stone-500 mb-1">Khoa phòng</label>
                  <select
                    value={editDept}
                    onChange={e => setEditDept(e.target.value)}
                    className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-stone-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                  >
                    {deptsToUse.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-wider text-stone-500 mb-1">Người tạo phiếu</label>
                  <input
                    type="text"
                    value={editCreator}
                    onChange={e => setEditCreator(e.target.value)}
                    className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-stone-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Edit quantities */}
              <div className="space-y-2">
                <span className="block text-[10px] uppercase font-black tracking-widest text-stone-500">Danh sách đồ vải bàn giao</span>
                <div className="border border-stone-200 rounded-lg overflow-x-auto bg-stone-50">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-stone-100 border-b border-stone-200 text-stone-600 font-bold">
                        <th className="p-2">Tên đồ vải / Mã</th>
                        <th className="p-2 text-center w-24">Lây nhiễm</th>
                        <th className="p-2 text-right w-36">Khai báo số lượng</th>
                        <th className="p-2 text-center w-12">Xóa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200 bg-white">
                      {editItemsList.map(item => (
                        <tr key={item.ma} className="hover:bg-stone-50 transition-colors">
                          <td className="p-2">
                            <div className="flex items-center gap-1.5">
                              {item.isCustom ? (
                                <input
                                  type="text"
                                  placeholder="✏️ Tự đánh chữ tên đồ vải..."
                                  value={item.ten}
                                  onChange={e => handleUpdateEditItemTenDirect(item.ma, e.target.value)}
                                  className="w-full bg-amber-50 border border-amber-300 rounded p-1 text-xs font-bold text-stone-900 focus:outline-none focus:bg-white"
                                />
                              ) : (
                                <span className="font-bold text-stone-800 block">{item.ten}</span>
                              )}
                              {item.isInfectious && (
                                <span className="bg-red-100 text-red-700 text-[8px] font-black px-1.5 py-0.5 rounded uppercase">
                                  ⚠️ Lây nhiễm
                                </span>
                              )}
                            </div>
                            <span className="text-[9px] text-stone-400 font-mono block">{item.ma}</span>
                          </td>
                          <td className="p-2 text-center">
                            <input
                              type="checkbox"
                              checked={item.isInfectious}
                              onChange={() => handleToggleEditItemInfectiousDirect(item.ma)}
                              className="w-4 h-4 rounded text-red-600 focus:ring-red-500 border-stone-300 cursor-pointer"
                            />
                          </td>
                          <td className="p-2 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <input
                                type="number"
                                className="w-20 h-8 border border-stone-300 rounded-md text-center text-xs font-mono font-black text-stone-950 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                value={item.qty}
                                onChange={e => {
                                  const v = Math.max(0, parseInt(e.target.value) || 0);
                                  handleUpdateEditItemQtyDirect(item.ma, v);
                                }}
                              />
                              <span className="text-[10px] text-stone-400 font-bold">cái</span>
                            </div>
                          </td>
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItemFromEditList(item.ma)}
                              className="text-stone-400 hover:text-red-600 p-1"
                              title="Xóa đồ vải này khỏi phiếu"
                            >
                              <X size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Inline Form to Add New Linen Item while editing */}
              <div className="bg-indigo-50/50 border border-indigo-150 p-3 rounded-xl space-y-2.5">
                <span className="block text-[10px] font-black uppercase tracking-wider text-indigo-950 flex items-center gap-1 font-bold">
                  ➕ Thêm đồ vải mới vào phiếu dơ:
                </span>
                <div className="flex flex-wrap items-end gap-3">
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-[9px] font-bold text-stone-500 mb-0.5">Chọn loại đồ vải</label>
                    <select
                      value={editAddLinenMa}
                      onChange={e => setEditAddLinenMa(e.target.value)}
                      className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs text-stone-800 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                    >
                      <option value="">-- Chọn đồ vải --</option>
                      {items.map(it => (
                        <option key={it.ma} value={it.ma}>
                          {it.ten} ({it.ma})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-24">
                    <label className="block text-[9px] font-bold text-stone-500 mb-0.5">Số lượng</label>
                    <input
                      type="number"
                      min="1"
                      value={editAddLinenQty}
                      onChange={e => setEditAddLinenQty(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-stone-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 h-9">
                    <input
                      type="checkbox"
                      id="editAddLinenInfectious"
                      checked={editAddLinenInfectious}
                      onChange={e => setEditAddLinenInfectious(e.target.checked)}
                      className="w-4 h-4 rounded text-red-600 focus:ring-red-500 border-stone-300 cursor-pointer"
                    />
                    <label htmlFor="editAddLinenInfectious" className="text-xs font-bold text-red-700 cursor-pointer select-none">Đồ lây nhiễm ⚠️</label>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddItemToEditList}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase rounded-lg shadow-sm transition-all whitespace-nowrap cursor-pointer"
                  >
                    Thêm vào list
                  </button>
                  {(activeSlip.isGuestSlip || activeSlip.dept.startsWith('Khách')) && (
                    <button
                      type="button"
                      onClick={handleAddCustomToEditList}
                      className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black uppercase rounded-lg shadow-sm transition-all whitespace-nowrap flex items-center gap-1 cursor-pointer"
                    >
                      ➕ Thêm dòng tự đánh chữ
                    </button>
                  )}
                </div>
              </div>

              {/* Actions buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-stone-150">
                <button
                  onClick={handleCancelEditSlip}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 border border-stone-300 rounded-lg text-stone-700 text-xs font-bold uppercase transition-all cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={handleSaveEditSlip}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase rounded-lg shadow-md transition-all cursor-pointer"
                >
                  Lưu thay đổi
                </button>
              </div>
            </div>
          ) : (
            /* NORMAL VIEW MODE */
            <div className="border border-stone-300 bg-white rounded-xl shadow-sm p-5 space-y-4 animate-fade-in">
              <div className="flex justify-between items-center pb-3 border-b border-stone-200">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-bold text-stone-900 uppercase">Chi tiết phiếu {activeSlip.id}</h2>
                    <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-md ${
                      activeSlip.status === 'pending' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {activeSlip.status === 'pending' ? 'Chờ duyệt' : 'Đã duyệt'}
                    </span>
                    {activeSlip.status === 'pending' && (hasPerm('ward') || hasPerm('linen')) && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleStartEditSlip(activeSlip)}
                          className="px-2 py-0.5 text-[9px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold border border-indigo-200 rounded transition-all flex items-center gap-0.5 cursor-pointer"
                          title="Sửa phiếu"
                        >
                          <Edit3 className="w-2.5 h-2.5 shrink-0" /> Sửa phiếu
                        </button>
                        <button
                          onClick={() => handleDeletePendingSlip(activeSlip.id)}
                          className="px-2 py-0.5 text-[9px] bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold border border-rose-200 rounded transition-all flex items-center gap-0.5 cursor-pointer"
                          title="Xóa phiếu"
                        >
                          <Trash2 className="w-2.5 h-2.5 shrink-0" /> Xóa phiếu
                        </button>
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-stone-500">Người lập: {activeSlip.createdBy} • Khoa {activeSlip.dept}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPrintModalOpen(true)}
                    className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 font-extrabold border border-amber-300 text-xs rounded-lg transition-all flex items-center gap-1 cursor-pointer font-bold shadow-2xs"
                    title="Xem trước & In phiếu giao nhận"
                  >
                    <Printer size={14} className="text-amber-600" /> In phiếu
                  </button>
                  <button onClick={() => setActiveSlipId(null)} className="text-stone-400 hover:text-stone-900 cursor-pointer p-1"><X size={18} /></button>
                </div>
              </div>

              {(activeSlip.isGuestSlip || activeSlip.dept.startsWith('Khách') || activeSlip.attachedImage) && (
                <div className="p-4 bg-amber-50/80 border-2 border-amber-400 rounded-xl space-y-2 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-amber-900 uppercase flex items-center gap-1.5">
                      <Bed className="w-4 h-4 text-amber-800 shrink-0" /> PHIẾU ĐỒ VẢI KHÁCH VIP (NV BUỒNG PHÒNG)
                    </span>
                    {(activeSlip.guestName || activeSlip.guestRoom) && (
                      <span className="text-xs font-bold text-amber-900 bg-amber-200/80 px-2.5 py-0.5 rounded-lg border border-amber-300">
                        {activeSlip.guestRoom ? `Phòng: ${activeSlip.guestRoom}` : ''} {activeSlip.guestName ? `• Khách: ${activeSlip.guestName}` : ''}
                      </span>
                    )}
                  </div>
                  {activeSlip.attachedImage && (
                    <div className="mt-2 bg-white p-2 rounded-lg border border-amber-300 inline-block shadow-sm">
                      <img src={activeSlip.attachedImage} alt="Đồ vải khách" className="max-h-48 object-contain rounded border border-stone-200" />
                      <p className="text-[10px] text-stone-500 font-mono mt-1 text-center">✓ Ảnh chụp đi kèm Bill Riêng Khách</p>
                    </div>
                  )}
                  {activeSlip.status === 'verified_dirty' && !activeSlip.laundryDispatchId && hasPerm('linen') && (
                    <div className="pt-2 border-t border-amber-200">
                      <button
                        onClick={() => handleCreateGuestBillRiêng(activeSlip)}
                        className="w-full py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        🚀 TẠO BILL RIÊNG GIAO CTY GIẶT (ĐỒ KHÁCH)
                      </button>
                      <p className="text-[10px] text-amber-800 text-center mt-1">
                        * Đồ khách VIP được tách thành Bill riêng với ảnh chụp đính kèm, không gộp chung vào Kho Dơ Tổng.
                      </p>
                    </div>
                  )}
                  {activeSlip.laundryDispatchId && (
                    <div className="text-xs font-bold text-emerald-800 bg-emerald-100/80 p-2 rounded-lg border border-emerald-300">
                      ✓ Đã tạo Bill Riêng: <span className="font-mono">{activeSlip.laundryDispatchId}</span> (Đang chuyển xưởng giặt)
                    </div>
                  )}
                </div>
              )}

              {activeSlip.isRewash && (
                <div className="p-4 bg-indigo-50/80 border-2 border-indigo-400 rounded-xl space-y-2 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-indigo-900 uppercase flex items-center gap-1.5 font-bold">
                      🔄 PHIẾU GỬI GIẶT LẠI (REWASH)
                    </span>
                    <span className="text-[10px] font-bold text-indigo-900 bg-indigo-200/80 px-2.5 py-0.5 rounded-lg border border-indigo-300">
                      Hao hụt Kho Sạch • Chuyển vào Kho Dơ
                    </span>
                  </div>
                  <p className="text-[11px] text-indigo-800 leading-normal">
                    Phiếu này ghi nhận đồ sạch mới từ xưởng về bị dính bẩn hoặc ố vàng cần gửi giặt lại. 
                    Khi duyệt phiếu này (M1), hệ thống sẽ <strong>tự động trừ Kho Sạch Tạm</strong> của bệnh viện, đồng thời <strong>cộng vào Kho Dơ Tạm</strong> để gom gửi lại xưởng giặt.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <span className="block text-[10px] uppercase font-black tracking-widest text-stone-500 font-bold">Danh mục kiểm dơ</span>
                <div className="border border-stone-200 rounded-lg overflow-x-auto bg-stone-50">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-stone-100 border-b border-stone-200 text-stone-600 font-bold">
                        <th className="p-2 text-center w-12">Tick nhận</th>
                        <th className="p-2">Tên đồ vải</th>
                        <th className="p-2 text-right">Khai báo (Khoa)</th>
                        <th className="p-2 text-right">Duyệt thực tế (BV)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200 bg-white">
                      {activeSlip.items.map(item => {
                        const isChecked = !!m1CheckedItems[item.ma];
                        const verifiedQty = m1ItemVerifiedQtys[item.ma] !== undefined ? m1ItemVerifiedQtys[item.ma] : (item.verifiedDirtyQty ?? item.qty);
                        return (
                          <tr key={item.ma} className={`hover:bg-stone-50 transition-colors ${isChecked ? 'bg-emerald-50/45' : ''}`}>
                            <td className="p-2 text-center">
                              {activeSlip.status === 'pending' && hasPerm('linen') ? (
                                <input
                                  type="checkbox"
                                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-stone-300 cursor-pointer"
                                  checked={isChecked}
                                  onChange={() => {
                                    setM1CheckedItems(prev => ({
                                      ...prev,
                                      [item.ma]: !prev[item.ma]
                                    }));
                                  }}
                                />
                              ) : (
                                <Check className="w-4 h-4 text-emerald-600 mx-auto" />
                              )}
                            </td>
                            <td className="p-2">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-stone-800">{item.ten}</span>
                                {item.isInfectious && (
                                  <span className="bg-red-100 text-red-700 text-[9px] font-black px-1.5 py-0.5 rounded uppercase border border-red-200">
                                    ⚠️ Lây nhiễm
                                  </span>
                                )}
                              </div>
                              <span className="text-[9px] text-stone-400 font-mono block">{item.ma}</span>
                            </td>
                            <td className="p-2 text-right font-mono font-bold text-stone-600">{item.qty} cái</td>
                            <td className="p-2 text-right font-mono text-amber-700 font-bold">
                              {activeSlip.status === 'pending' && hasPerm('linen') ? (
                                <input
                                  type="number"
                                  className="w-24 h-9 border border-stone-300 rounded-lg text-center text-sm font-mono font-black text-stone-900 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  value={verifiedQty}
                                  onChange={e => {
                                    const val = Math.max(0, parseInt(e.target.value) || 0);
                                    setM1ItemVerifiedQtys(prev => ({
                                      ...prev,
                                      [item.ma]: val
                                    }));
                                  }}
                                />
                              ) : (
                                <span>{verifiedQty} cái</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Confirm Slip as Dirty Block */}
              {activeSlip.status === 'pending' && hasPerm('linen') && (
                <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 flex justify-between items-center gap-3">
                  <p className="text-[11px] text-stone-600">
                    Hãy đối chiếu thực tế, chỉnh sửa lại số lượng nếu có lệch số dơ và bấm xác nhận để đồ dơ đi vào <strong>Kho dơ BV</strong>.
                  </p>
                  <button
                    onClick={() => handleConfirmDirtyLinenM1(activeSlip.id)}
                    disabled={isConfirmingM1}
                    className={`px-4 py-2 text-white text-xs font-bold uppercase rounded-lg shadow whitespace-nowrap transition-all ${
                      isConfirmingM1 
                        ? 'bg-stone-400 cursor-not-allowed opacity-50' 
                        : 'bg-amber-600 hover:bg-amber-700 cursor-pointer'
                    }`}
                  >
                    {isConfirmingM1 ? '⏳ Đang xử lý...' : 'Xác Nhận & Đổ Vào Kho Dơ'}
                  </button>
                </div>
              )}

              {activeSlip.status !== 'pending' && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-800">
                  ✓ Đã được xác nhận bởi <strong>{activeSlip.verifiedDirtyBy || 'Nhân viên Đồ Vải'}</strong> lúc {activeSlip.verifiedDirtyAt || activeSlip.createdAt}
                </div>
              )}
            </div>
          )
        ) : (
          <div className="h-48 border border-dashed border-stone-200 rounded-xl flex items-center justify-center text-stone-400 text-xs">
            Chưa chọn phiếu dơ khoa phòng nào
          </div>
        )}
      </div>

      {/* ======================= CREATE SLIP MODAL ======================= */}
      {isCreatingSlip && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-[#1A1A1A] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 bg-stone-100 border-b border-stone-300 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-black text-stone-900 uppercase tracking-wide">
                  {draftIsRewash ? '🔄 Tạo Phiếu Gửi Giặt Lại (Rewash)' : 'Tạo Phiếu Khai Báo Giao Nhận Đồ Vải Dơ'}
                </h3>
                <span className="text-[10px] text-stone-500 block mt-0.5">Mẫu khai báo gửi dơ nội bộ để đổ vào Kho dơ</span>
              </div>
              <button onClick={() => setIsCreatingSlip(false)} className="text-stone-400 hover:text-stone-700 cursor-pointer font-bold">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Form Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-stone-50 p-4 rounded-xl border border-stone-200/60">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-stone-500 mb-1.5">Khoa phòng khai báo</label>
                  {(!effectiveIsWardUser || isOrderlyUser) && !draftIsRewash ? (
                    <select
                      value={selectedDept}
                      onChange={e => handleDeptChange(e.target.value)}
                      className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-2 text-xs font-bold text-stone-800 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                    >
                      {deptsToUse.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                      <option value="Khách">Phòng khách (VIP/Khách lẻ)</option>
                    </select>
                  ) : (
                    <div className="w-full bg-stone-200 border border-stone-300 rounded-lg px-2.5 py-2 text-xs font-black text-stone-700">
                      {selectedDept}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-stone-500 mb-1.5">Người lập phiếu</label>
                  <input
                    type="text"
                    value={slipCreator}
                    onChange={e => setSlipCreator(e.target.value)}
                    className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-2 text-xs font-bold text-stone-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Special options for rewash & guest slips */}
              {!draftIsRewash && (
                <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-200 p-3 rounded-lg">
                  <input
                    type="checkbox"
                    id="draftIsRewashCheck"
                    checked={draftIsRewash}
                    onChange={e => {
                      const checked = e.target.checked;
                      setDraftIsRewash(checked);
                      if (checked) {
                        setSelectedDept(currentWardName && currentWardName !== 'Tất cả' && currentWardName !== 'Kho trung tâm' ? currentWardName : deptsToUse[0]);
                      }
                    }}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-indigo-300 cursor-pointer"
                  />
                  <div>
                    <label htmlFor="draftIsRewashCheck" className="text-xs font-black text-indigo-950 cursor-pointer flex items-center gap-1.5 select-none font-bold">
                      <RefreshCw className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span>TÍCH CHỌN PHIẾU GIẶT LẠI (REWASH)</span>
                    </label>
                    <span className="text-[10px] text-indigo-800 block leading-normal mt-0.5">
                      Sử dụng khi phát hiện đồ sạch trong kho bị bẩn hoặc ố vàng cần gửi giặt lại (sẽ trừ tồn kho sạch và cộng dơ).
                    </span>
                  </div>
                </div>
              )}

              {selectedDept.startsWith('Khách') && (
                <div className="p-4 border-2 border-amber-300 bg-amber-50/70 rounded-xl space-y-3.5 shadow-xs">
                  <span className="text-xs font-black text-amber-900 uppercase flex items-center gap-1.5 tracking-wider font-bold">
                    <Bed className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>THÔNG TIN KHÁCH VIP RIÊNG (NV BUỒNG PHÒNG ĐẦY ĐỦ HÌNH ẢNH)</span>
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] font-bold text-amber-800 uppercase mb-1">Họ tên khách</label>
                      <input
                        type="text"
                        placeholder="VD: Mr. John Henry"
                        value={draftGuestName}
                        onChange={e => setDraftGuestName(e.target.value)}
                        className="w-full bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-stone-800 focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-amber-800 uppercase mb-1">Số phòng</label>
                      <input
                        type="text"
                        placeholder="VD: Phòng VIP 502"
                        value={draftGuestRoom}
                        onChange={e => setDraftGuestRoom(e.target.value)}
                        className="w-full bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-stone-800 focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                  
                  <div className="pt-2.5 border-t border-amber-200/80 space-y-2">
                    <label className="block text-[10px] font-bold text-amber-900 uppercase flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-amber-800 shrink-0" />
                      <span>HÌNH ẢNH THỰC TẾ ĐỒ KHÁCH (CHỤP TRỰC TIẾP HOẶC TẢI LÊN)</span>
                    </label>
                    
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Chụp ảnh trực tiếp từ camera điện thoại */}
                      <label className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer">
                        <Camera className="w-3.5 h-3.5 shrink-0" />
                        <span>Chụp ảnh trực tiếp</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={handleUploadDraftImage}
                          className="hidden"
                        />
                      </label>

                      {/* Chọn ảnh có sẵn từ thư viện thiết bị */}
                      <label className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold uppercase rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer">
                        <ImageIcon className="w-3.5 h-3.5 shrink-0" />
                        <span>Chọn từ thư viện</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleUploadDraftImage}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {/* Hiển thị hình ảnh xem trước */}
                    {draftAttachedImage && (
                      <div className="mt-2 bg-white p-2.5 rounded-xl border border-amber-300 shadow-sm inline-block space-y-2">
                        <div className="relative group">
                          <img
                            src={draftAttachedImage}
                            alt="Mẫu đồ khách"
                            className="max-h-48 rounded-lg object-contain border border-stone-200"
                            referrerPolicy="no-referrer"
                          />
                          <button
                            type="button"
                            onClick={() => setDraftAttachedImage(undefined)}
                            className="mt-1.5 w-full py-1 bg-red-100 hover:bg-red-200 text-red-700 text-[11px] font-bold rounded-md transition-colors flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3 shrink-0" />
                            <span>Xóa ảnh này</span>
                          </button>
                        </div>
                        <p className="text-[10px] text-emerald-700 font-bold text-center flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-3 h-3 shrink-0" />
                          <span>Đã đính kèm hình ảnh thực tế đồ khách</span>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Items List in Modal */}
              <div className="space-y-2">
                <span className="block text-[10px] uppercase font-black tracking-widest text-stone-500 font-bold">Bảng kê khai chi tiết số lượng</span>
                <div className="border border-stone-200 rounded-xl overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-stone-100 border-b border-stone-200 text-stone-600 font-bold">
                        <th className="p-2.5">Tên đồ vải / Mã</th>
                        <th className="p-2.5 text-center w-24">Lây nhiễm</th>
                        <th className="p-2.5 text-right w-36">Khai báo số lượng</th>
                        <th className="p-2.5 text-center w-12">Xóa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200 bg-white">
                      {draftItems.map(item => (
                        <tr key={item.ma} className="hover:bg-stone-50 transition-colors">
                          <td className="p-2.5">
                            <div className="flex items-center gap-1.5">
                              {item.isCustom ? (
                                <input
                                  type="text"
                                  placeholder="✏️ Tên đồ vải ngoài danh mục..."
                                  value={item.ten}
                                  onChange={e => {
                                    const val = e.target.value;
                                    setDraftItems(prev => prev.map(x => x.ma === item.ma ? { ...x, ten: val } : x));
                                  }}
                                  className="w-full bg-amber-50 border border-amber-300 rounded p-1 text-xs font-bold text-stone-900 focus:outline-none focus:bg-white"
                                />
                              ) : (
                                <span className="font-bold text-stone-800 block text-[11px]">{item.ten}</span>
                              )}
                              {item.isInfectious && (
                                <span className="bg-red-100 text-red-700 text-[8px] font-black px-1.5 py-0.5 rounded uppercase">
                                  ⚠️ Lây nhiễm
                                </span>
                              )}
                            </div>
                            <span className="text-[9px] text-stone-400 font-mono block mt-0.5">{item.ma}</span>
                          </td>
                          <td className="p-2.5 text-center">
                            <input
                              type="checkbox"
                              checked={item.isInfectious}
                              onChange={() => {
                                setDraftItems(prev => prev.map(x => x.ma === item.ma ? { ...x, isInfectious: !x.isInfectious } : x));
                              }}
                              className="w-4 h-4 rounded text-red-600 focus:ring-red-500 border-stone-300 cursor-pointer"
                            />
                          </td>
                          <td className="p-2.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <input
                                type="number"
                                className="w-20 h-8 border border-stone-300 rounded-md text-center text-xs font-mono font-black text-stone-950 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                value={item.qty || ''}
                                placeholder="0"
                                onChange={e => {
                                  const val = Math.max(0, parseInt(e.target.value) || 0);
                                  setDraftItems(prev => prev.map(x => x.ma === item.ma ? { ...x, qty: val } : x));
                                }}
                              />
                              <span className="text-[10px] text-stone-400 font-bold">cái</span>
                            </div>
                          </td>
                          <td className="p-2.5 text-center">
                            {item.isCustom ? (
                              <button
                                type="button"
                                onClick={() => handleRemoveDraftItem(item.ma)}
                                className="text-stone-400 hover:text-red-600 p-1 cursor-pointer"
                              >
                                <X size={14} />
                              </button>
                            ) : (
                              <span className="text-stone-300 font-bold">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Add Custom Item form inside modal */}
              <div className="bg-stone-50 border border-stone-200 p-3 rounded-lg space-y-2">
                <span className="block text-[10px] font-black uppercase tracking-wider text-stone-600 font-bold">
                  ➕ Thêm mặt hàng ngoài danh mục:
                </span>
                <div className="flex flex-wrap items-end gap-3">
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-[9px] font-bold text-stone-400 mb-0.5">Tên đồ vải ngoài danh mục</label>
                    <input
                      type="text"
                      placeholder="Nhập tên đồ thêu riêng, đồ bệnh nhân..."
                      value={customName}
                      onChange={e => setCustomName(e.target.value)}
                      className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs text-stone-800 focus:outline-none"
                    />
                  </div>
                  <div className="w-20">
                    <label className="block text-[9px] font-bold text-stone-400 mb-0.5">Số lượng</label>
                    <input
                      type="number"
                      min="1"
                      value={customQty}
                      onChange={e => setCustomQty(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none font-bold"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 h-8">
                    <input
                      type="checkbox"
                      id="customInfectiousCheck"
                      checked={customInfectious}
                      onChange={e => setCustomInfectious(e.target.checked)}
                      className="w-4 h-4 rounded text-red-600 focus:ring-red-500 border-stone-300 cursor-pointer"
                    />
                    <label htmlFor="customInfectiousCheck" className="text-xs font-bold text-red-700 cursor-pointer">Lây nhiễm ⚠️</label>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddCustomDraftFromTable}
                    className="px-4 py-2 bg-stone-800 hover:bg-stone-900 text-white text-xs font-black uppercase rounded-lg shadow-sm transition-all whitespace-nowrap cursor-pointer"
                  >
                    Thêm vào list
                  </button>
                </div>
              </div>
            </div>

            <div className="p-4 bg-stone-100 border-t border-stone-300 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsCreatingSlip(false)}
                className="px-4 py-2 border border-stone-300 rounded-lg text-stone-700 hover:bg-stone-200 text-xs font-bold uppercase transition-all cursor-pointer font-bold"
              >
                Đóng lại
              </button>
              <button
                type="button"
                onClick={handleSubmitSlip}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase rounded-lg shadow-md transition-all cursor-pointer font-bold"
              >
                Gửi phiếu khai báo 🚀
              </button>
            </div>
          </div>
        </div>
      )}

      <PrintBillModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        data={activeSlip ? {
          title: activeSlip.isGuestSlip ? "PHIẾU BÀN GIAO ĐỒ VẢI KHÁCH VIP" : "PHIẾU GIAO NHẬN ĐỒ VẢI DƠ KHOA PHÒNG",
          subTitle: `Khoa phòng khai báo đồ vải dơ gửi bộ phận quản lý đồ vải bệnh viện`,
          billId: activeSlip.id,
          date: activeSlip.createdAt,
          dept: activeSlip.dept,
          sender: activeSlip.createdBy,
          receiver: activeSlip.verifiedDirtyBy || 'NV Đồ Vải',
          guestName: activeSlip.guestName,
          guestRoom: activeSlip.guestRoom,
          statusText: activeSlip.status === 'pending' ? 'Chờ duyệt' : 'Đã duyệt kho dơ',
          items: activeSlip.items.map(item => ({
            ma: item.ma,
            ten: item.ten,
            group: item.group,
            qty: item.qty,
            realQty: m1ItemVerifiedQtys[item.ma] !== undefined ? m1ItemVerifiedQtys[item.ma] : (item.verifiedDirtyQty ?? item.qty),
            note: item.isInfectious ? 'Đồ vải lây nhiễm' : ''
          }))
        } : null}
      />
    </div>
  );
}
