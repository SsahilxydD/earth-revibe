'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

type Step = 'phone' | 'otp';

const fade = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

export default function LoginPage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState<string[]>(Array(6).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const id = setTimeout(() => setResendTimer((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [resendTimer]);

  const maskedPhone = phone ? `+91 ${phone.slice(0, 5)}*****` : '';

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
      setTimeout(() => otpRefs.current[0]?.focus(), 200);
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
        const user = await api.post('/auth/verify-otp', { phone: `+91${phone}`, code });
        setUser(user);
        router.replace('/');
      } catch (err: any) {
        setError(err?.message || 'Verification failed');
        setShake(true);
        setTimeout(() => setShake(false), 500);
      } finally {
        setLoading(false);
      }
    },
    [phone, setUser, router]
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
      {step === 'otp' ? (
        <motion.div
          key="otp"
          initial={fade.initial}
          animate={fade.animate}
          exit={fade.exit}
          transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
        >
          {/* WhatsApp icon */}
          <div className="mb-4 flex justify-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#25D366]/10">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path
                  d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"
                  fill="#25D366"
                />
                <path
                  d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.932-1.41A9.953 9.953 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a7.96 7.96 0 01-4.11-1.14l-.29-.174-3.01.86.8-2.92-.19-.31A7.96 7.96 0 014 12c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z"
                  fill="#25D366"
                />
              </svg>
            </div>
          </div>

          <h1 className="mb-1 text-center text-[17px] font-bold uppercase tracking-[0.15em] text-[#1a1a1a] sm:text-lg">
            Verify OTP
          </h1>
          <p className="mb-7 text-center text-[13px] leading-relaxed text-[#8a8279]">
            We sent a code via WhatsApp to{' '}
            <span className="font-medium text-[#1a1a1a]">{maskedPhone}</span>
          </p>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                className="overflow-hidden rounded-xl bg-[#cf2929]/5 px-4 py-3 text-center text-[13px] text-[#cf2929]"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* OTP inputs */}
          <div
            className={`mb-7 flex justify-center gap-2.5 sm:gap-3 ${shake ? 'animate-shake' : ''}`}
            onPaste={handleOtpPaste}
          >
            {otp.map((digit, i) => (
              <motion.input
                key={i}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05, duration: 0.25, ease: 'easeOut' }}
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
                className={`h-[52px] w-[44px] rounded-xl border-2 bg-[#faf8f5] text-center text-lg font-semibold tracking-wide text-[#1a1a1a] outline-none transition-all duration-200 sm:h-14 sm:w-12 ${
                  digit
                    ? 'border-[#1a1a1a] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
                    : 'border-[#e0dbd4] hover:border-[#c5bfb6]'
                } focus:border-[#1a1a1a] focus:bg-white focus:shadow-[0_2px_12px_rgba(0,0,0,0.08)] disabled:opacity-50`}
                autoComplete="one-time-code"
              />
            ))}
          </div>

          {/* Verify button */}
          <motion.button
            type="button"
            onClick={() => handleVerifyOtp(otp.join(''))}
            disabled={loading || otp.join('').length !== 6}
            whileTap={{ scale: 0.98 }}
            className="flex h-[50px] w-full items-center justify-center rounded-xl bg-[#1a1a1a] text-[13px] font-semibold uppercase tracking-[0.12em] text-white transition-all hover:bg-[#2d2d2d] active:bg-[#000] disabled:opacity-40"
          >
            {loading ? (
              <span className="flex items-center gap-2.5">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className="opacity-20"
                  />
                  <path
                    d="M12 2a10 10 0 019.95 9"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </svg>
                Verifying
              </span>
            ) : (
              'Verify & Continue'
            )}
          </motion.button>

          {/* Footer actions */}
          <div className="mt-5 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setStep('phone');
                setError('');
                setOtp(Array(6).fill(''));
              }}
              className="text-[12px] tracking-wide text-[#8a8279] transition-colors hover:text-[#1a1a1a]"
            >
              <span className="mr-1">&#8592;</span> Change number
            </button>
            {resendTimer > 0 ? (
              <span className="tabular-nums text-[12px] tracking-wide text-[#b0a898]">
                Resend in {resendTimer}s
              </span>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={loading}
                className="text-[12px] font-semibold tracking-wide text-[#1a1a1a] transition-colors hover:text-[#8b6f47] disabled:opacity-50"
              >
                Resend OTP
              </button>
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
        </motion.div>
      ) : (
        <motion.div
          key="phone"
          initial={fade.initial}
          animate={fade.animate}
          exit={fade.exit}
          transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
        >
          {/* Phone icon */}
          <div className="mb-4 flex justify-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f0ece6]">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#8b6f47"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                <line x1="12" y1="18" x2="12" y2="18" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          <h1 className="mb-1 text-center text-[17px] font-bold uppercase tracking-[0.15em] text-[#1a1a1a] sm:text-lg">
            Welcome Back
          </h1>
          <p className="mb-7 text-center text-[13px] leading-relaxed text-[#8a8279]">
            Enter your mobile number to continue
          </p>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                className="overflow-hidden rounded-xl bg-[#cf2929]/5 px-4 py-3 text-center text-[13px] text-[#cf2929]"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Phone input */}
          <div className="mb-2">
            <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.15em] text-[#8a8279]">
              Phone Number
            </label>
            <div className="group flex overflow-hidden rounded-xl border-2 border-[#e0dbd4] bg-[#faf8f5] transition-all duration-200 focus-within:border-[#1a1a1a] focus-within:bg-white focus-within:shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
              <span className="flex h-[50px] shrink-0 items-center border-r border-[#e0dbd4] px-4 text-[14px] font-medium text-[#8a8279] transition-colors group-focus-within:border-[#d4cfc8] group-focus-within:text-[#1a1a1a]">
                +91
              </span>
              <input
                id="phone"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                aria-label="Phone number"
                placeholder="98765 43210"
                value={phone}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setPhone(v);
                  setError('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSendOtp();
                }}
                disabled={loading}
                className="h-[50px] w-full bg-transparent px-4 text-[15px] font-medium tracking-wide text-[#1a1a1a] outline-none placeholder:text-[#c5bfb6] disabled:opacity-50"
                autoFocus
              />
            </div>
          </div>

          {/* Helper text */}
          <p className="mb-5 text-[11px] text-[#b0a898]">
            We&apos;ll send a one-time code via WhatsApp
          </p>

          {/* Submit button */}
          <motion.button
            type="button"
            onClick={handleSendOtp}
            disabled={loading || phone.length !== 10}
            whileTap={{ scale: 0.98 }}
            className="flex h-[50px] w-full items-center justify-center gap-2.5 rounded-xl bg-[#1a1a1a] text-[13px] font-semibold uppercase tracking-[0.12em] text-white transition-all hover:bg-[#2d2d2d] active:bg-[#000] disabled:opacity-40"
          >
            {loading ? (
              <span className="flex items-center gap-2.5">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className="opacity-20"
                  />
                  <path
                    d="M12 2a10 10 0 019.95 9"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </svg>
                Sending
              </span>
            ) : (
              <>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="opacity-80"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                  <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.932-1.41A9.953 9.953 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a7.96 7.96 0 01-4.11-1.14l-.29-.174-3.01.86.8-2.92-.19-.31A7.96 7.96 0 014 12c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z" />
                </svg>
                Send OTP via WhatsApp
              </>
            )}
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
