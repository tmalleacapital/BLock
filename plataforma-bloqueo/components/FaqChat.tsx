'use client';

import { useState, useRef, useEffect } from 'react';
import { FAQ_ITEMS } from '@/lib/faq';

interface Message {
  role: 'bot' | 'user';
  text: string;
}

const WELCOME: Message = {
  role: 'bot',
  text: '¡Hola! 👋 Soy la ayuda rápida de B-Lock. Elige una pregunta y te muestro la respuesta al instante.',
};

const cardShadow = '0 8px 30px 0 rgb(0 0 0 / 0.18)';

function ChatIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function HelpIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

export default function FaqChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [messages, open]);

  function ask(item: { q: string; a: string }) {
    setMessages((prev) => [...prev, { role: 'user', text: item.q }, { role: 'bot', text: item.a }]);
  }

  function reset() {
    setMessages([WELCOME]);
  }

  return (
    <>
      {/* Etiqueta indicadora + halo (solo con el chat cerrado) */}
      {!open && (
        <>
          <span
            aria-hidden
            className="fixed bottom-5 right-5 z-40 rounded-full animate-ping pointer-events-none"
            style={{ width: '56px', height: '56px', backgroundColor: 'var(--accent)', opacity: 0.18 }}
          />
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Abrir preguntas frecuentes"
            className="fixed z-50 flex items-center gap-2 rounded-full py-2 pl-3 pr-4"
            style={{
              bottom: '32px',
              right: '88px',
              backgroundColor: 'var(--card)',
              border: '1px solid var(--accent)',
              color: 'var(--foreground)',
              boxShadow: cardShadow,
              whiteSpace: 'nowrap',
            }}
          >
            <span
              className="flex items-center justify-center rounded-full shrink-0"
              style={{ width: '20px', height: '20px', backgroundColor: 'color-mix(in srgb, var(--accent) 16%, transparent)', color: 'var(--accent)' }}
            >
              <HelpIcon />
            </span>
            <span className="text-[13px] font-medium">
              ¿Dudas?{' '}
              <span style={{ color: 'var(--accent)', fontWeight: 700 }}>Preguntas frecuentes</span>
            </span>
            <span
              aria-hidden
              style={{
                position: 'absolute',
                right: '-7px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: 0,
                height: 0,
                borderTop: '7px solid transparent',
                borderBottom: '7px solid transparent',
                borderLeft: '8px solid var(--accent)',
              }}
            />
          </button>
        </>
      )}

      {/* Botón flotante */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Cerrar ayuda' : 'Abrir preguntas frecuentes'}
        className="fixed bottom-5 right-5 z-50 flex items-center justify-center rounded-full transition-transform hover:scale-105 active:scale-95"
        style={{
          width: '56px',
          height: '56px',
          backgroundColor: 'var(--accent)',
          color: '#fff',
          boxShadow: cardShadow,
        }}
      >
        {open ? <CloseIcon /> : <ChatIcon />}
      </button>

      {/* Panel del chat */}
      {open && (
        <div
          className="fixed bottom-24 right-5 z-50 flex flex-col rounded-2xl border overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-200"
          style={{
            width: 'min(380px, calc(100vw - 2.5rem))',
            height: 'min(560px, calc(100vh - 9rem))',
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border)',
            boxShadow: cardShadow,
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 border-b shrink-0"
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--background)' }}
          >
            <div className="flex items-center gap-2.5">
              <span
                className="flex items-center justify-center rounded-full shrink-0"
                style={{ width: '30px', height: '30px', backgroundColor: 'color-mix(in srgb, var(--accent) 14%, transparent)', color: 'var(--accent)' }}
              >
                <ChatIcon />
              </span>
              <div className="leading-tight">
                <p className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>Preguntas frecuentes</p>
                <p className="text-[11px]" style={{ color: 'var(--muted)' }}>Respuestas al instante</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Cerrar"
              className="p-1.5 rounded-lg transition-colors hover:opacity-70"
              style={{ color: 'var(--muted)' }}
            >
              <CloseIcon />
            </button>
          </div>

          {/* Thread */}
          <div ref={threadRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className="max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed"
                  style={
                    m.role === 'user'
                      ? { backgroundColor: 'var(--accent)', color: '#fff', borderBottomRightRadius: '4px' }
                      : { backgroundColor: 'var(--background)', color: 'var(--foreground)', border: '1px solid var(--border)', borderBottomLeftRadius: '4px' }
                  }
                >
                  {m.text}
                </div>
              </div>
            ))}
          </div>

          {/* Preguntas como opciones */}
          <div className="shrink-0 border-t px-3 py-3 space-y-1.5 overflow-y-auto" style={{ borderColor: 'var(--border)', maxHeight: '45%' }}>
            <div className="flex items-center justify-between px-1 mb-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
                Elige tu pregunta
              </p>
              {messages.length > 1 && (
                <button
                  type="button"
                  onClick={reset}
                  className="text-[11px] font-medium transition-opacity hover:opacity-70"
                  style={{ color: 'var(--accent)' }}
                >
                  Limpiar
                </button>
              )}
            </div>
            {FAQ_ITEMS.map((item) => (
              <button
                key={item.q}
                type="button"
                onClick={() => ask(item)}
                className="w-full text-left rounded-xl px-3 py-2 text-[13px] font-medium transition-colors"
                style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)', border: '1px solid var(--border)' }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'color-mix(in srgb, var(--accent) 9%, transparent)';
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--background)';
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
                }}
              >
                {item.q}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
