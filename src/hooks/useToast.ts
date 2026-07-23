import { useState } from 'react';

export interface ToastMsg {
  text: string;
  color: string;
  id: number;
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  const triggerToast = (text: string, color: string = '#16A34A') => {
    const id = Date.now();
    setToasts(prev => [...prev, { text, color, id }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  };

  return {
    toasts,
    triggerToast
  };
}
