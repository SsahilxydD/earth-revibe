'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';

type Step = 'phone' | 'otp';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called after successful login */
  onSuccess?: () => void;
}

export function LoginModal({ isOpen, onClose, onSuccess }: LoginModalProps) {
  const checkAuth = useAuthStore((s) => s.checkAuth);

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState<string[]>(Array(6).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const phoneRef = useRef<HTMLInputElement>(null);

  // Reset state when modal opens
  // Note: do NOT lock/unlock body scroll here — the cart drawer already manages it.
  // Adding a second lock/unlock pair causes the cart to become scrollable when the modal closes.
  useEffect(() => {
    if (isOpen) {
      setStep('phone');
      setPhone('');
      setOtp(Array(6).fill(''));
      setError('');
      setLoading(false);
      setTimeout(() => phoneRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Countdown timer for resend
  useEffect(() => {
    if (resendTimer <= 0) return;
    const id = setTimeout(() => setResendTimer((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [resendTimer]);

  // Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const handle = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [isOpen, onClose]);

  const maskedPhone = phone ? `+91 ${phone.slice(0, 5)} ${phone.slice(5)}` : '';

  const handleSendOtp = async () => {
    if (phone.length !== 10 || !/^[6-9]\d{9}$/.test(phone)) {
      setError('Enter a valid 10-digit mobile number');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await api.post('/auth/send-otp', { phone: `+91${phone}` });
      setStep('otp');
      setResendTimer(30);
      setOtp(Array(6).fill(''));
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err: any) {
      setError(err?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = useCallback(
    async (code: string) => {
      setLoading(true);
      setError('');
      try {
        await api.post('/auth/verify-otp', { phone: `+91${phone}`, code });
        await checkAuth();
        onClose();
        // Delay onSuccess so auth state propagates before checkout starts
        if (onSuccess) setTimeout(onSuccess, 100);
      } catch (err: any) {
        setError(err?.message || 'Verification failed');
        setShake(true);
        setTimeout(() => setShake(false), 500);
      } finally {
        setLoading(false);
      }
    },
    [phone, checkAuth, onClose, onSuccess]
  );

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...otp];
    next[index] = value;
    setOtp(next);

    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }

    if (value && index === 5) {
      const code = next.join('');
      if (code.length === 6) handleVerifyOtp(code);
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const next = Array(6).fill('');
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setOtp(next);

    if (pasted.length === 6) {
      handleVerifyOtp(pasted);
    } else {
      otpRefs.current[pasted.length]?.focus();
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/send-otp', { phone: `+91${phone}` });
      setResendTimer(30);
      setOtp(Array(6).fill(''));
      otpRefs.current[0]?.focus();
    } catch (err: any) {
      setError(err?.message || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 animate-fade-in" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 mx-4 w-full max-w-sm animate-slide-up rounded-xl bg-white p-6 shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full hover:bg-[var(--color-surface)] transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {step === 'otp' ? (
          <>
            <h2 className="mb-2 text-center text-lg font-bold uppercase tracking-wider">
              Verify OTP
            </h2>
            <p className="mb-6 text-center text-sm text-[var(--color-muted)]">
              OTP sent to {maskedPhone}
            </p>

            {error && (
              <div className="mb-4 rounded-[var(--button-radius)] bg-red-50 px-4 py-3 text-sm text-[var(--color-sale)]">
                {error}
              </div>
            )}

            <div
              className={cn('mb-6 flex justify-center gap-2', shake && 'animate-shake')}
              onPaste={handleOtpPaste}
            >
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    otpRefs.current[i] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  disabled={loading}
                  className="h-12 w-11 rounded-lg border border-[var(--color-border)] bg-white text-center text-lg font-semibold transition-colors focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] disabled:opacity-60"
                  autoComplete="one-time-code"
                />
              ))}
            </div>

            <button
              type="button"
              onClick={() => handleVerifyOtp(otp.join(''))}
              disabled={loading || otp.join('').length !== 6}
              className="flex h-12 w-full items-center justify-center rounded-[var(--button-radius)] bg-[var(--color-primary)] text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-60"
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>

            <div className="mt-4 flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={() => {
                  setStep('phone');
                  setError('');
                  setOtp(Array(6).fill(''));
                }}
                className="text-[var(--color-muted)] hover:text-[var(--color-primary)]"
              >
                Change number
              </button>
              {resendTimer > 0 ? (
                <span className="text-[var(--color-muted)]">Resend in {resendTimer}s</span>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={loading}
                  className="text-[var(--color-primary)] hover:underline disabled:opacity-60"
                >
                  Resend OTP
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            <h2 className="mb-2 text-center text-lg font-bold uppercase tracking-wider">
              Log in to checkout
            </h2>
            <p className="mb-6 text-center text-sm text-[var(--color-muted)]">
              Enter your phone number to continue
            </p>

            {error && (
              <div className="mb-4 rounded-[var(--button-radius)] bg-red-50 px-4 py-3 text-sm text-[var(--color-sale)]">
                {error}
              </div>
            )}

            <div className="mb-4">
              <div className="flex">
                <span className="flex h-12 items-center rounded-l-[var(--button-radius)] border border-r-0 border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-muted)]">
                  +91
                </span>
                <input
                  ref={phoneRef}
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="98765 43210"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value.replace(/\D/g, '').slice(0, 10));
                    setError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendOtp();
                  }}
                  disabled={loading}
                  className="h-12 w-full rounded-r-[var(--button-radius)] border border-[var(--color-border)] bg-white px-3 text-sm transition-colors focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] disabled:opacity-60"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleSendOtp}
              disabled={loading || phone.length !== 10}
              className="flex h-12 w-full items-center justify-center rounded-[var(--button-radius)] bg-[var(--color-primary)] text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-60"
            >
              {loading ? 'Sending OTP...' : 'Send OTP via WhatsApp'}
            </button>
          </>
        )}
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-6px); }
          40%, 80% { transform: translateX(6px); }
        }
        .animate-shake { animation: shake 0.4s ease-in-out; }
      `}</style>
    </div>
  );
}
