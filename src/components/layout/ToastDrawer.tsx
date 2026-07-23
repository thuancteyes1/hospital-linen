/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

export interface ToastMsg {
  text: string;
  color: string;
  id: number;
}

interface ToastDrawerProps {
  toasts: ToastMsg[];
}

export default function ToastDrawer({ toasts }: ToastDrawerProps) {
  return (
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
  );
}
