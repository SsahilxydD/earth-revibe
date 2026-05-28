'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

type Step = 'phone' | 'name' | 'otp';

const fade = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
};

export default function LoginPage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState('');
  const [needsName, setNeedsName] = useState(false);
  const [otp, setOtp] = useState<string[]>(Array(6).fill(''));
  const [loading, setLoading] = useState(false);
  // Seed with a "session expired" notice when the api client bounced the user
  // here after a failed token refresh (?expired=1).
  const [error, setError] = useState(() =>
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('expired') === '1'
      ? 'Your session expired. Please log in again.'
      : ''
  );
  const [shake, setShake] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const id = setTimeout(() => setResendTimer((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [resendTimer]);

  const formattedPhone = phone ? `+91 ${phone.slice(0, 5)} ${phone.slice(5)}` : '';

  const handleSendOtp = async () => {
    if (phone.length !== 10 || !/^[6-9]\d{9}$/.test(phone)) {
      setError('Enter a valid 10-digit mobile number');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.post<{ isNewUser: boolean; hasName: boolean }>('/auth/send-otp', {
        phone: `+91${phone}`,
      });
      setResendTimer(30);
      setOtp(Array(6).fill(''));
      const mustAskName = !!res && (res.isNewUser || !res.hasName);
      setNeedsName(mustAskName);
      if (mustAskName) {
        setStep('name');
        setTimeout(() => nameRef.current?.focus(), 200);
      } else {
        setStep('otp');
        setTimeout(() => otpRefs.current[0]?.focus(), 200);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleNameNext = () => {
    const trimmed = fullName.trim();
    if (trimmed.length < 2) {
      setError('Please enter your full name');
      return;
    }
    setError('');
    setStep('otp');
    setTimeout(() => otpRefs.current[0]?.focus(), 200);
  };

  const handleVerifyOtp = useCallback(
    async (code: string) => {
      setLoading(true);
      setError('');
      try {
        const body: Record<string, string> = { phone: `+91${phone}`, code };
        if (needsName && fullName.trim()) {
          const parts = fullName.trim().split(/\s+/);
          body.firstName = parts[0];
          if (parts.length > 1) body.lastName = parts.slice(1).join(' ');
        }
        const user = await api.post('/auth/verify-otp', body);
        setUser(user);
        // Return the user to where they were headed before login (e.g. a
        // wishlist tap or a protected page), guarding against open redirects.
        const returnUrl = new URLSearchParams(window.location.search).get('returnUrl');
        router.replace(returnUrl && returnUrl.startsWith('/') ? returnUrl : '/');
      } catch (err: any) {
        setError(err?.message || 'Verification failed');
        setShake(true);
        setTimeout(() => setShake(false), 500);
      } finally {
        setLoading(false);
      }
    },
    [phone, fullName, needsName, setUser, router]
  );

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...otp];
    next[index] = value;
    setOtp(next);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
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
    if (pasted.length === 6) handleVerifyOtp(pasted);
    else otpRefs.current[pasted.length]?.focus();
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

  return (
    <AnimatePresence mode="wait">
      {step === 'name' ? (
        <motion.div
          key="name"
          {...fade}
          transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          className="flex flex-col items-center gap-12"
        >
          <div className="flex flex-col items-center gap-3">
            <h1 className="text-[28px] font-light tracking-[-0.5px] text-black">Welcome</h1>
            <p className="text-center text-[13px] font-light text-[#999]">
              What should we call you?
            </p>
            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-center text-[13px] text-[#cf2929]"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <div className="w-full max-w-sm">
            <label className="text-[10px] font-normal tracking-[1.5px] text-[#999]">
              FULL NAME
            </label>
            <div className="mt-3 border-b border-[#e5e5e5] pb-3">
              <input
                ref={nameRef}
                type="text"
                autoComplete="name"
                maxLength={80}
                placeholder="Priya Sharma"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  setError('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleNameNext();
                }}
                disabled={loading}
                className="w-full bg-transparent text-[14px] font-light text-black outline-none placeholder:text-[#ccc] disabled:opacity-50"
              />
            </div>
            <button
              type="button"
              onClick={handleNameNext}
              disabled={loading || fullName.trim().length < 2}
              className="mt-8 flex h-[46px] w-full items-center justify-center bg-black text-[11px] font-normal tracking-[2px] text-white transition-opacity disabled:opacity-40"
            >
              CONTINUE TO OTP
            </button>
            <p className="mt-5 text-center text-[11px] font-light text-[#999]">
              We'll use this on your orders and account.
            </p>
          </div>
        </motion.div>
      ) : step === 'otp' ? (
        <motion.div
          key="otp"
          {...fade}
          transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          className="flex flex-col items-center gap-12"
        >
          {/* Header */}
          <div className="flex flex-col items-center gap-3">
            <h1 className="text-[28px] font-light tracking-[-0.5px] text-black">Verify OTP</h1>
            <p className="text-center text-[13px] font-light text-[#999]">
              Enter the 6-digit code sent to {formattedPhone}
            </p>
            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-center text-[13px] text-[#cf2929]"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* OTP boxes — 48×56, gap 12, no radius, mono font */}
          <div className={`flex gap-3 ${shake ? 'animate-shake' : ''}`} onPaste={handleOtpPaste}>
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
                className={`h-14 w-12 border bg-white text-center font-mono text-[22px] text-black outline-none transition-colors ${
                  digit ? 'border-black' : 'border-[#e5e5e5]'
                } focus:border-black disabled:opacity-50`}
                autoComplete="one-time-code"
              />
            ))}
          </div>

          {/* Verify button — full width, black, 50px height */}
          <button
            type="button"
            onClick={() => handleVerifyOtp(otp.join(''))}
            disabled={loading || otp.join('').length !== 6}
            className="flex h-[50px] w-full items-center justify-center bg-black text-[12px] font-normal tracking-[2px] text-white transition-opacity disabled:opacity-40"
          >
            {loading ? 'VERIFYING...' : 'VERIFY'}
          </button>

          {/* Footer — resend + change number */}
          <div className="flex w-full flex-col items-center gap-4">
            <div className="flex items-center gap-1">
              <span className="text-[12px] font-light text-[#999]">
                Didn&apos;t receive the code?
              </span>
              {resendTimer > 0 ? (
                <span className="font-mono text-[12px] tracking-[1px] text-[#ccc]">
                  {String(Math.floor(resendTimer / 60)).padStart(2, '0')}:
                  {String(resendTimer % 60).padStart(2, '0')}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={loading}
                  className="text-[12px] font-normal text-black disabled:opacity-50"
                >
                  Resend
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setStep('phone');
                setError('');
                setOtp(Array(6).fill(''));
              }}
              className="text-[12px] font-light text-[#999] transition-colors hover:text-black"
            >
              &#8592; Change number
            </button>
          </div>

          <style>{`
            @keyframes shake {
              0%, 100% { transform: translateX(0); }
              20%, 60% { transform: translateX(-6px); }
              40%, 80% { transform: translateX(6px); }
            }
            .animate-shake { animation: shake 0.4s ease-in-out; }
          `}</style>
        </motion.div>
      ) : (
        <motion.div
          key="phone"
          {...fade}
          transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          className="flex flex-col items-center gap-12"
        >
          {/* Header */}
          <div className="flex flex-col items-center gap-3">
            <h1 className="text-[28px] font-light tracking-[-0.5px] text-black">Log in</h1>
            <p className="text-[13px] font-light tracking-[0.2px] text-[#999]">
              Enter your mobile number to continue
            </p>
            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-center text-[13px] text-[#cf2929]"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Phone field — underline input */}
          <div className="w-full">
            <label className="text-[10px] font-normal tracking-[1.5px] text-[#999]">
              MOBILE NUMBER
            </label>
            <div className="mt-3 flex items-center gap-2 border-b border-[#e5e5e5] pb-3">
              <span className="text-[14px] font-normal text-black">+91</span>
              <div className="h-4 w-px bg-[#ccc]" />
              <input
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
                className="w-full bg-transparent text-[14px] font-light text-black outline-none placeholder:text-[#ccc] disabled:opacity-50"
                autoFocus
              />
            </div>
          </div>

          {/* Send OTP button — full width, black, 50px height */}
          <button
            type="button"
            onClick={handleSendOtp}
            disabled={loading || phone.length !== 10}
            className="flex h-[50px] w-full items-center justify-center bg-black text-[12px] font-normal tracking-[2px] text-white transition-opacity disabled:opacity-40"
          >
            {loading ? 'SENDING...' : 'SEND OTP'}
          </button>

          {/* Terms */}
          <p className="text-center text-[11px] font-light leading-relaxed text-[#bbb]">
            By continuing, you agree to our Terms &amp; Privacy Policy
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
