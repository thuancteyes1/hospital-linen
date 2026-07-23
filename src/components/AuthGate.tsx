/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Account, PendingRegistration } from '../types';
import { Shirt, Eye, EyeOff, Check, Clock } from 'lucide-react';
import { auth, googleAuthProvider, signInWithPopup } from '../lib/firebase.ts';

interface AuthGateProps {
  accounts: Account[];
  onLogin: (acc: Account) => void;
  pendingRegs: PendingRegistration[];
  onRegisterSubmit: (reg: PendingRegistration) => void;
}

export default function AuthGate({ accounts, onLogin, pendingRegs, onRegisterSubmit }: AuthGateProps) {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isSigningInGoogle, setIsSigningInGoogle] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsSigningInGoogle(true);
    setLoginError('');
    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      const idToken = await result.user.getIdToken();
      
      const res = await fetch('/api/auth/verify-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Xác thực với server thất bại.');
      }
      const dbUser = await res.json();
      
      const acc: Account = {
        username: dbUser.uid,
        email: dbUser.email,
        name: dbUser.name,
        isAdmin: dbUser.isAdmin,
        status: dbUser.status,
        userIdx: -1
      };
      
      onLogin(acc);
    } catch (err: any) {
      console.error('Google login error:', err);
      setLoginError(err.message || 'Đăng nhập bằng Google thất bại. Vui lòng thử lại.');
    } finally {
      setIsSigningInGoogle(false);
    }
  };

  // Register states
  const [regName, setRegName] = useState('');
  const [regUser, setRegUser] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPass, setRegPass] = useState('');
  const [regSuccess, setRegSuccess] = useState(false);
  const [regError, setRegError] = useState('');
  const [passStrength, setPassStrength] = useState({ score: 0, label: '', color: '' });

  const handlePasswordChange = (val: string) => {
    setRegPass(val);
    if (!val) {
      setPassStrength({ score: 0, label: '', color: '' });
      return;
    }
    let score = 0;
    if (val.length >= 6) score++;
    if (val.length >= 10) score++;
    if (/[A-Z]/.test(val) && /[0-9]/.test(val)) score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;
    
    score = Math.max(1, Math.min(4, score));
    const labels = ['Yếu', 'Tạm ổn', 'Trung bình', 'Mạnh'];
    const colors = ['#C4432A', '#D97706', '#2563EB', '#16A34A'];
    setPassStrength({
      score,
      label: labels[score - 1],
      color: colors[score - 1]
    });
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const doLogin = async () => {
    setLoginError('');
    if (!username.trim() || !password) {
      setLoginError('Vui lòng điền đầy đủ tên đăng nhập và mật khẩu.');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Tên đăng nhập hoặc mật khẩu không chính xác.');
      }
      const data = await res.json();
      localStorage.setItem('token', data.token); // Save JWT to localStorage
      onLogin(data.user);
    } catch (err: any) {
      setLoginError(err.message || 'Có lỗi xảy ra khi đăng nhập.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const quickLogin = async (user: string, pass: string) => {
    setUsername(user);
    setPassword(pass);
    setLoginError('');
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user, password: pass })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Đăng nhập dùng thử thất bại.');
      }
      const data = await res.json();
      localStorage.setItem('token', data.token); // Save JWT to localStorage
      onLogin(data.user);
    } catch (err: any) {
      setLoginError(err.message || 'Đăng nhập thất bại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const doRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    if (!regName.trim() || !regUser.trim() || !regEmail.trim() || !regPass) {
      setRegError('Vui lòng điền tất cả các thông tin bắt buộc.');
      return;
    }
    if (regPass.length < 6) {
      setRegError('Mật khẩu phải chứa ít nhất 6 ký tự.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName.trim(),
          username: regUser.trim().toLowerCase(),
          email: regEmail.trim().toLowerCase(),
          password: regPass
        })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Đăng ký thất bại.');
      }
      
      const newReg: PendingRegistration = {
        name: regName.trim(),
        username: regUser.trim().toLowerCase(),
        email: regEmail.trim().toLowerCase(),
        status: 'pending',
        regDate: new Date().toLocaleDateString('vi-VN')
      };
      onRegisterSubmit(newReg);
      setRegSuccess(true);
    } catch (err: any) {
      setRegError(err.message || 'Có lỗi xảy ra khi gửi yêu cầu đăng ký.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#F4F7FC]/85 flex items-center justify-center z-50 p-6 overflow-y-auto backdrop-blur-md">
      <div className="w-full max-w-md border border-black/5 bg-white/75 shadow-2xl flex flex-col p-1 rounded-3xl overflow-hidden backdrop-blur-xl">
        
        {/* Header decoration */}
        <div className="border-b border-black/5 p-6 text-center bg-black/[0.01] relative rounded-t-3xl">
          <div className="w-16 h-16 bg-[#007AFF]/10 text-[#007AFF] border border-[#007AFF]/25 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg shadow-blue-500/10">
            <Shirt size={34} />
          </div>
          <h1 className="font-bold text-4xl tracking-tight text-slate-900">
            HospLinen <span className="font-bold tracking-widest text-sm uppercase bg-gradient-to-r from-[#007AFF] to-[#AF52DE] text-white px-2.5 py-0.5 ml-1.5 rounded-full inline-block align-middle">PRO</span>
          </h1>
          <p className="font-mono text-[9px] tracking-widest uppercase text-slate-500 mt-2">
            Hệ thống Quản lý Đồ vải Bệnh viện
          </p>
        </div>

        {/* Form Tab Toggles */}
        {!regSuccess && (
          <div className="grid grid-cols-2 border-b border-black/5 bg-black/[0.01]">
            <button
              onClick={() => { setActiveTab('login'); setLoginError(''); }}
              className={`py-3 text-xs uppercase tracking-wider font-semibold border-r border-black/5 transition-colors rounded-none ${
                activeTab === 'login' ? 'bg-black/[0.02] text-[#1D1D1F]' : 'text-slate-400 hover:text-slate-900'
              }`}
            >
              ĐĂNG NHẬP
            </button>
            <button
              onClick={() => { setActiveTab('register'); setRegError(''); }}
              className={`py-3 text-xs uppercase tracking-wider font-semibold transition-colors rounded-none ${
                activeTab === 'register' ? 'bg-black/[0.02] text-[#1D1D1F]' : 'text-slate-400 hover:text-slate-900'
              }`}
            >
              ĐĂNG KÝ
            </button>
          </div>
        )}

        {regSuccess ? (
          <div className="p-8 text-center fade-in">
            <div className="w-12 h-12 rounded-full border border-[#30D158]/40 bg-[#30D158]/10 text-[#30D158] flex items-center justify-center mx-auto mb-4">
              <Check size={20} />
            </div>
            <h2 className="font-bold text-xl mb-2 text-slate-900">Đăng Ký Thành Công!</h2>
            <p className="text-xs text-slate-500 leading-relaxed mb-6">
              Yêu cầu đăng ký tài khoản <span className="font-bold text-slate-900">{regUser}</span> đã được ghi nhận và đang chờ Admin xét duyệt cấp quyền.
            </p>
            <button
              onClick={() => {
                setRegSuccess(false);
                setActiveTab('login');
                setUsername(regUser);
                setRegName('');
                setRegUser('');
                setRegEmail('');
                setRegPass('');
              }}
              className="w-full py-3 bg-gradient-to-r from-[#0A84FF] to-[#0066E2] text-white text-xs font-semibold uppercase tracking-widest hover:brightness-110 transition-all rounded-xl shadow-lg shadow-blue-500/20"
            >
              Quay Lại Đăng Nhập
            </button>
          </div>
        ) : activeTab === 'login' ? (
          <div className="p-6 flex-1 fade-in">
            {loginError && (
              <div className="mb-4 p-3 border border-[#C4432A] bg-[#FDF2F0] text-xs text-[#C4432A] font-medium">
                {loginError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-bold text-[#8C8984] mb-1">
                  Tên đăng nhập / Email
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Tên đăng nhập hoặc email..."
                  className="w-full bg-[#EBE8E3] border border-[#1A1A1A] p-2.5 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#C4432A]"
                  onKeyDown={e => { if (e.key === 'Enter') doLogin(); }}
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-widest font-bold text-[#8C8984] mb-1">
                  Mật khẩu
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Nhập mật khẩu..."
                    className="w-full bg-[#EBE8E3] border border-[#1A1A1A] p-2.5 text-xs text-[#1A1A1A] pr-10 focus:outline-none focus:border-[#C4432A]"
                    onKeyDown={e => { if (e.key === 'Enter') doLogin(); }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C8984] hover:text-[#1A1A1A]"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={doLogin}
                className="w-full py-3 bg-gradient-to-r from-[#0A84FF] to-[#0066E2] text-white text-xs font-semibold uppercase tracking-widest hover:brightness-110 transition-all rounded-xl shadow-lg shadow-blue-500/20 mt-2"
              >
                Đăng Nhập Hệ Thống
              </button>


            </div>
          </div>
        ) : (
          <form onSubmit={doRegister} className="p-6 flex-1 fade-in">
            {regError && (
              <div className="mb-4 p-3 border border-[#C4432A] bg-[#FDF2F0] text-xs text-[#C4432A] font-medium">
                {regError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-bold text-[#8C8984] mb-1">
                  Họ và tên <span className="text-[#C4432A]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={e => setRegName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                  className="w-full bg-[#EBE8E3] border border-[#1A1A1A] p-2.5 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#C4432A]"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-widest font-bold text-[#8C8984] mb-1">
                  Tên đăng nhập <span className="text-[#C4432A]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={regUser}
                  onChange={e => setRegUser(e.target.value)}
                  placeholder="vd: nguyena"
                  className="w-full bg-[#EBE8E3] border border-[#1A1A1A] p-2.5 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#C4432A]"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-widest font-bold text-[#8C8984] mb-1">
                  Email xác nhận <span className="text-[#C4432A]">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={e => setRegEmail(e.target.value)}
                  placeholder="email@hospital.vn"
                  className="w-full bg-[#EBE8E3] border border-[#1A1A1A] p-2.5 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#C4432A]"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-widest font-bold text-[#8C8984] mb-1">
                  Mật khẩu <span className="text-[#C4432A]">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={regPass}
                    onChange={e => handlePasswordChange(e.target.value)}
                    placeholder="Tối thiểu 6 ký tự"
                    className="w-full bg-[#EBE8E3] border border-[#1A1A1A] p-2.5 text-xs text-[#1A1A1A] pr-10 focus:outline-none focus:border-[#C4432A]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C8984]"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {/* Password strength indicators */}
                {regPass && (
                  <div className="mt-2">
                    <div className="flex gap-1 h-1">
                      {[1, 2, 3, 4].map(idx => (
                        <div
                          key={idx}
                          className="flex-1 transition-all duration-300"
                          style={{
                            backgroundColor: idx <= passStrength.score ? passStrength.color : 'rgba(26,26,26,0.1)'
                          }}
                        />
                      ))}
                    </div>
                    <span className="block text-[10px] font-semibold mt-1" style={{ color: passStrength.color }}>
                      Độ bảo mật: {passStrength.label}
                    </span>
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#1A1A1A] text-[#F5F2ED] text-xs font-semibold uppercase tracking-widest hover:bg-[#C4432A] transition-colors border border-[#1A1A1A] mt-4"
              >
                Gửi Yêu Cầu Đăng Ký
              </button>

              <p className="text-[10px] text-[#8C8984] text-center mt-3 leading-relaxed flex items-center justify-center gap-1">
                <Clock size={12} />
                Tài khoản sẽ được quản trị viên kích hoạt và gán vai trò sau khi kiểm duyệt.
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
