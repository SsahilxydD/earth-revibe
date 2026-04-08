'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

type Step = 'phone' | 'otp';

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

  const formattedPhone = phone ? `+91 ${phone.slice(0, 5)} ${phone.slice(5)}` : '';

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
        const user = await api.post('/auth/verify-otp', {
          phone: `+91${phone}`,
          code,
        });
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
          {...fade}
          transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          className="flex flex-col items-center"
        >
          <h1 className="text-[28px] font-light tracking-[-0.5px] text-black">Verify OTP</h1>
          <p className="mt-3 text-center text-[13px] font-light text-[#999]">
            Enter the 6-digit code sent to {formattedPhone}
          </p>

          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 text-center text-[13px] text-[#cf2929]"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          {/* OTP boxes */}
          <div
            className={`mt-10 flex gap-3 ${shake ? 'animate-shake' : ''}`}
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
                className={`h-14 w-12 border bg-white text-center font-mono text-[22px] text-black outline-none transition-colors ${
                  digit ? 'border-black' : 'border-[#e5e5e5]'
                } focus:border-black disabled:opacity-50`}
                autoComplete="one-time-code"
              />
            ))}
          </div>

          {/* Verify button */}
          <button
            type="button"
            onClick={() => handleVerifyOtp(otp.join(''))}
            disabled={loading || otp.join('').length !== 6}
            className="mt-10 flex h-[50px] w-full items-center justify-center bg-black text-[12px] font-normal tracking-[2px] text-white transition-opacity disabled:opacity-40"
          >
            {loading ? 'VERIFYING...' : 'VERIFY'}
          </button>

          {/* Footer */}
          <div className="mt-8 flex w-full flex-col items-center gap-4">
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
          className="flex flex-col items-center"
        >
          <h1 className="text-[28px] font-light tracking-[-0.5px] text-black">Log in</h1>
          <p className="mt-3 text-[13px] font-light tracking-[0.2px] text-[#999]">
            Enter your mobile number to continue
          </p>

          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 text-center text-[13px] text-[#cf2929]"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Phone field */}
          <div className="mt-12 w-full">
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

          {/* Send OTP button */}
          <button
            type="button"
            onClick={handleSendOtp}
            disabled={loading || phone.length !== 10}
            className="mt-10 flex h-[50px] w-full items-center justify-center bg-black text-[12px] font-normal tracking-[2px] text-white transition-opacity disabled:opacity-40"
          >
            {loading ? 'SENDING...' : 'SEND OTP'}
          </button>

          {/* Terms */}
          <p className="mt-6 text-center text-[11px] font-light leading-relaxed text-[#bbb]">
            By continuing, you agree to our Terms &amp; Privacy Policy
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
