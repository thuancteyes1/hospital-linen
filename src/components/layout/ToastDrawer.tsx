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
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm w-[calc(100vw-3rem)] pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className="p-3 border border-slate-200 bg-white/95 backdrop-blur-md text-xs font-semibold text-slate-800 flex items-start gap-2.5 shadow-lg rounded-xl fade-in pointer-events-auto max-h-24 overflow-hidden"
          style={{ borderLeftWidth: '5px', borderLeftColor: t.color }}
        >
          <div className="w-2 h-2 rounded-full mt-1 shrink-0" style={{ backgroundColor: t.color }} />
          <span className="line-clamp-3 break-words text-[11px] leading-relaxed flex-1">{t.text}</span>
        </div>
      ))}
    </div>
  );
}
