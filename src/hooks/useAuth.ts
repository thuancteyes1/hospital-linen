import { useState, useMemo } from 'react';
import { Account, User, Role } from '../types';

export function useAuth(
  users: User[],
  roles: Role[],
  departments: string[],
  triggerToast: (text: string, color?: string) => void
) {
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);

  // --- SIMULATED TESTING ROLE STATE ---
  const [simulatedRole, setSimulatedRole] = useState<'ward' | 'orderly' | 'housekeeping' | 'linen' | 'laundry' | 'clean' | 'all' | 'admin'>('all');
  const [simulatedWard, setSimulatedWard] = useState<string>('Khoa Cấp cứu đa khoa');

  const handleLogin = (acc: Account) => {
    setCurrentAccount(acc);
    triggerToast(`Đăng nhập thành công làm: ${acc.name}`, '#2563EB');
  };

  const handleLogout = () => {
    setCurrentAccount(null);
    localStorage.removeItem('token');
    triggerToast('Đã đăng xuất tài khoản.', '#1A1A1A');
  };

  // --- USER POSITION AND ROLES MATRICES ---
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
    if (!currentAccount) return false;

    if (simulatedRole === 'admin' || simulatedRole === 'linen' || simulatedRole === 'clean') {
      return true;
    }
    if (simulatedRole === 'ward' || simulatedRole === 'orderly' || simulatedRole === 'housekeeping' || simulatedRole === 'laundry') {
      return false;
    }

    if (isCurrentlyAdmin || currentAccount.isAdmin) return true;
    if (isWardUser || isHousekeepingUser || isLaundryUser) return false;

    const u = users[currentAccount.userIdx] || users.find(x => x.email === currentAccount.email);
    const roleIdx = u ? u.role : undefined;
    if (roleIdx === 0 || roleIdx === 1) return true;

    const roleLower = (currentRoleName || '').toLowerCase();
    if (roleLower.includes('admin') ||
        roleLower.includes('quản trị') ||
        roleLower.includes('trưởng kho') ||
        roleLower.includes('thủ kho') ||
        roleLower.includes('nhân viên đồ vải') ||
        roleLower.includes('quản lý đồ vải') ||
        roleLower.includes('kho sạch') ||
        roleLower.includes('đồ vải')) {
      return true;
    }

    return false;
  }, [currentAccount, simulatedRole, isCurrentlyAdmin, isWardUser, isHousekeepingUser, isLaundryUser, users, currentRoleName]);

  const canSeeTrangBill = useMemo(() => {
    if (!currentAccount) return false;

    if (simulatedRole === 'admin' || simulatedRole === 'linen') {
      return true;
    }
    if (simulatedRole === 'clean' || simulatedRole === 'ward' || simulatedRole === 'orderly' || simulatedRole === 'housekeeping' || simulatedRole === 'laundry') {
      return false;
    }

    if (isCurrentlyAdmin || currentAccount.isAdmin) return true;
    if (isWardUser || isHousekeepingUser || isLaundryUser) return false;

    const u = users[currentAccount.userIdx] || users.find(x => x.email === currentAccount.email);
    const roleIdx = u ? u.role : undefined;
    if (roleIdx === 0 || roleIdx === 1) return true;

    const roleLower = (currentRoleName || '').toLowerCase();
    if (roleLower.includes('admin') ||
        roleLower.includes('quản trị') ||
        roleLower.includes('trưởng kho') ||
        roleLower.includes('thủ kho')) {
      return true;
    }

    return false;
  }, [currentAccount, simulatedRole, isCurrentlyAdmin, isWardUser, isHousekeepingUser, isLaundryUser, users, currentRoleName]);

  return {
    currentAccount,
    setCurrentAccount,
    simulatedRole,
    setSimulatedRole,
    simulatedWard,
    setSimulatedWard,
    handleLogin,
    handleLogout,
    effectiveAccount,
    currentRoleName,
    currentWardName,
    canSeeLinenDelivery,
    isLaundryUser,
    isWardUser,
    isHousekeepingUser,
    isCurrentlyAdmin,
    canSeeReport,
    canSeeTrangBill
  };
}
