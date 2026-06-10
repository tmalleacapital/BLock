'use client';

import { createContext, useContext, useState, useCallback, useRef } from 'react';

interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message?: string;
}

interface ToastContextValue {
  addToast: (toast: Omit<ToastItem, 'id'>) => void;
}

const ToastContext = createContext<ToastContextValue>({ addToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    const t = timers.current.get(id);
    if (t) clearTimeout(t);
    timers.current.delete(id);
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback(
    (toast: Omit<ToastItem, 'id'>) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev, { ...toast, id }]);
      const t = setTimeout(() => dismiss(id), 5000);
      timers.current.set(id, t);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div
        className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none"
        style={{ maxWidth: '320px' }}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto rounded-xl border px-4 py-3 flex items-start gap-3 animate-in slide-in-from-bottom-2 duration-200"
            style={{
              backgroundColor: 'var(--card)',
              borderColor:
                toast.type === 'success'
                  ? 'var(--success)'
                  : toast.type === 'error'
                    ? 'var(--danger)'
                    : 'var(--border)',
              boxShadow: '0 4px 20px 0 rgb(0 0 0 / 0.18)',
            }}
          >
            <span
              className="w-2 h-2 rounded-full mt-[3px] shrink-0"
              style={{
                backgroundColor:
                  toast.type === 'success'
                    ? 'var(--success)'
                    : toast.type === 'error'
                      ? 'var(--danger)'
                      : 'var(--accent)',
              }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-tight" style={{ color: 'var(--foreground)' }}>
                {toast.title}
              </p>
              {toast.message && (
                <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--muted)' }}>
                  {toast.message}
                </p>
              )}
            </div>
            <button
              onClick={() => dismiss(toast.id)}
              className="shrink-0 text-xs leading-none hover:opacity-70 transition-opacity"
              style={{ color: 'var(--muted)' }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
