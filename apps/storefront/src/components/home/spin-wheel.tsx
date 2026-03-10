'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------

interface Segment {
  label: string;
  color: string;
  code: string;
  probability: number;
}

const SEGMENTS: Segment[] = [
  { label: 'Buy 2 Get 1', color: '#97826F', code: 'KTC0W7VSGW9K', probability: 30 },
  { label: '33% OFF', color: '#6D7B6E', code: 'MP8ZTBAJKN2J', probability: 30 },
  { label: '\u20B9500 off \u20B91500+', color: '#8DB7AC', code: 'WEY2NK3Q09DH', probability: 30 },
  { label: '50% OFF', color: '#583220', code: '3VMYX9F5BAHB', probability: 9 },
  { label: 'Free T-Shirt', color: '#C4A882', code: '', probability: 1 },
];

const COOLDOWN_KEY = 'earth-revibe-spin-cooldown';
const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours
const AUTO_SHOW_DELAY = 5000; // 5 seconds
const GOLD = '#D4AF37';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Weighted random selection returning segment index. */
function pickSegmentIndex(): number {
  const total = SEGMENTS.reduce((s, seg) => s + seg.probability, 0);
  let rand = Math.random() * total;
  for (let i = 0; i < SEGMENTS.length; i++) {
    rand -= SEGMENTS[i].probability;
    if (rand <= 0) return i;
  }
  return 0;
}

function isOnCooldown(): boolean {
  if (typeof window === 'undefined') return false;
  const stored = localStorage.getItem(COOLDOWN_KEY);
  if (!stored) return false;
  return Date.now() - Number(stored) < COOLDOWN_MS;
}

function setCooldown(): void {
  localStorage.setItem(COOLDOWN_KEY, String(Date.now()));
}

// ---------------------------------------------------------------------------
// Canvas drawing
// ---------------------------------------------------------------------------

function drawWheel(
  ctx: CanvasRenderingContext2D,
  size: number,
  rotation: number,
) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 6; // leave room for gold ring
  const segCount = SEGMENTS.length;
  const arc = (2 * Math.PI) / segCount;

  ctx.clearRect(0, 0, size, size);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);

  // Draw segments
  for (let i = 0; i < segCount; i++) {
    const startAngle = i * arc - Math.PI / 2;
    const endAngle = startAngle + arc;

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = SEGMENTS[i].color;
    ctx.fill();

    // Segment border
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Label text
    ctx.save();
    ctx.rotate(startAngle + arc / 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `600 ${Math.round(size * 0.038)}px "Poppins", sans-serif`;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 4;

    const labelRadius = radius * 0.62;
    ctx.fillText(SEGMENTS[i].label, labelRadius, 0);

    ctx.shadowBlur = 0;
    ctx.restore();
  }

  ctx.restore();

  // Gold ring border
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 2, 0, 2 * Math.PI);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 4;
  ctx.shadowColor = GOLD;
  ctx.shadowBlur = 12;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Outer faint glow ring
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 5, 0, 2 * Math.PI);
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.15)';
  ctx.lineWidth = 2;
  ctx.stroke();
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type Phase = 'phone' | 'wheel' | 'result';

export function SpinWheel() {
  const [visible, setVisible] = useState(false);
  const [phase, setPhase] = useState<Phase>('phone');
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<Segment | null>(null);
  const [copied, setCopied] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const currentRotationRef = useRef(0);
  const dismissedRef = useRef(false);

  // Responsive canvas size
  const [canvasSize, setCanvasSize] = useState(320);
  useEffect(() => {
    function updateSize() {
      setCanvasSize(window.innerWidth < 480 ? 280 : 320);
    }
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Auto-show after 5 seconds if not on cooldown and not dismissed
  useEffect(() => {
    if (isOnCooldown()) return;
    const timer = setTimeout(() => {
      if (!dismissedRef.current) {
        setVisible(true);
      }
    }, AUTO_SHOW_DELAY);
    return () => clearTimeout(timer);
  }, []);

  // Draw wheel whenever rotation or size changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high-DPI screens
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasSize * dpr;
    canvas.height = canvasSize * dpr;
    canvas.style.width = `${canvasSize}px`;
    canvas.style.height = `${canvasSize}px`;
    ctx.scale(dpr, dpr);

    drawWheel(ctx, canvasSize, wheelRotation);
  }, [wheelRotation, canvasSize]);

  // Lock body scroll when overlay is open
  useEffect(() => {
    if (visible) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [visible]);

  const close = useCallback(() => {
    setVisible(false);
    dismissedRef.current = true;
    document.body.style.overflow = '';
  }, []);

  // Escape key to close
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && visible && !spinning) close();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [visible, spinning, close]);

  // ---------- Phone gate ----------
  function handlePhoneSubmit(e: React.FormEvent) {
    e.preventDefault();
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) {
      setPhoneError('Please enter a valid phone number (10+ digits)');
      return;
    }
    setPhoneError('');
    setPhase('wheel');
  }

  // ---------- Spin logic ----------
  function spin() {
    if (spinning) return;
    setSpinning(true);

    const winIndex = pickSegmentIndex();
    const segCount = SEGMENTS.length;
    const arc = (2 * Math.PI) / segCount;

    // Target: pointer is at top (- PI/2). We need the winning segment's center
    // to align with the top. The segment center is at winIndex * arc + arc/2
    // from the rotation reference. We want rotation such that:
    //   rotation + winIndex * arc + arc/2 = -PI/2  (mod 2PI)
    // => rotation = -PI/2 - winIndex * arc - arc/2
    // Then add full rotations for dramatic spin.
    const fullSpins = (4 + Math.random() * 2) * 2 * Math.PI; // 4-6 rotations
    const targetSegmentAngle = -(winIndex * arc + arc / 2) - Math.PI / 2;
    // Add small random offset within the segment for realism (+-30% of arc)
    const jitter = (Math.random() - 0.5) * arc * 0.6;
    const targetRotation = currentRotationRef.current + fullSpins + targetSegmentAngle - currentRotationRef.current % (2 * Math.PI) + jitter;

    const duration = 4000; // 4 seconds
    const startRotation = currentRotationRef.current;
    const startTime = performance.now();

    function easeOutCubicBezier(t: number): number {
      // Approximation of cubic-bezier(0.2, 0.8, 0.3, 1)
      const p = 1 - t;
      return 1 - p * p * p * p;
    }

    function animate(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutCubicBezier(progress);
      const currentRot = startRotation + (targetRotation - startRotation) * eased;

      currentRotationRef.current = currentRot;
      setWheelRotation(currentRot);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        // Spin complete
        setSpinning(false);
        setResult(SEGMENTS[winIndex]);
        setPhase('result');
        setCooldown();
      }
    }

    animFrameRef.current = requestAnimationFrame(animate);
  }

  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // ---------- Copy to clipboard ----------
  async function copyCode() {
    if (!result?.code) return;
    try {
      await navigator.clipboard.writeText(result.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = result.code;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (!visible) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="spin-overlay"
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{
            backgroundColor: 'rgba(8, 6, 3, 0.80)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !spinning) close();
          }}
        >
          {/* Container */}
          <motion.div
            className="relative w-full max-w-[440px] rounded-2xl overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, #1a1510 0%, #0d0b08 100%)',
              border: '1px solid rgba(212, 175, 55, 0.25)',
              boxShadow: '0 0 60px rgba(212, 175, 55, 0.08)',
            }}
            initial={{ scale: 0.85, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.85, opacity: 0, y: 30 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          >
            {/* Close button */}
            {!spinning && (
              <button
                onClick={close}
                className="absolute top-3 right-3 z-10 p-1.5 rounded-full transition-colors"
                style={{ color: 'rgba(255,255,255,0.4)' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.8)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            )}

            <div className="px-6 pt-8 pb-8 flex flex-col items-center">
              {/* Title */}
              <h2
                className="text-center font-[var(--font-cinzel)] text-2xl font-medium tracking-wide"
                style={{
                  color: GOLD,
                  textShadow: `0 0 20px rgba(212, 175, 55, 0.4), 0 0 40px rgba(212, 175, 55, 0.15)`,
                }}
              >
                Spin &amp; Win
              </h2>
              <p
                className="mt-1.5 text-center font-[var(--font-sans)] text-xs tracking-[0.08em] uppercase"
                style={{ color: 'rgba(255, 255, 255, 0.5)' }}
              >
                Try your luck for an exclusive discount
              </p>

              {/* ---------- PHONE GATE ---------- */}
              {phase === 'phone' && (
                <motion.form
                  onSubmit={handlePhoneSubmit}
                  className="mt-8 w-full max-w-[300px] flex flex-col items-center gap-4"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                >
                  <label
                    className="w-full text-left font-[var(--font-sans)] text-xs"
                    style={{ color: 'rgba(255, 255, 255, 0.6)' }}
                  >
                    Phone number (required to spin)
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        if (phoneError) setPhoneError('');
                      }}
                      placeholder="Enter your phone number"
                      className="mt-1.5 w-full rounded-lg px-4 py-3 text-sm outline-none transition-shadow"
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                        border: `1px solid ${phoneError ? '#C0392B' : 'rgba(212, 175, 55, 0.2)'}`,
                        color: '#FFFFFF',
                        fontFamily: 'var(--font-sans)',
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = GOLD;
                        e.currentTarget.style.boxShadow = `0 0 0 2px rgba(212, 175, 55, 0.15)`;
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = phoneError ? '#C0392B' : 'rgba(212, 175, 55, 0.2)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                      autoComplete="tel"
                    />
                  </label>
                  {phoneError && (
                    <p className="w-full text-left text-xs" style={{ color: '#C0392B' }}>
                      {phoneError}
                    </p>
                  )}
                  <button
                    type="submit"
                    className="w-full rounded-lg py-3 text-sm font-semibold tracking-wider uppercase transition-all"
                    style={{
                      background: `linear-gradient(135deg, ${GOLD}, #B8972E)`,
                      color: '#1a1510',
                      fontFamily: 'var(--font-sans)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = `0 0 20px rgba(212, 175, 55, 0.35)`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    Continue
                  </button>
                </motion.form>
              )}

              {/* ---------- WHEEL ---------- */}
              {(phase === 'wheel' || phase === 'result') && (
                <motion.div
                  className="mt-6 relative flex items-center justify-center"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4 }}
                >
                  {/* Radial glow behind wheel */}
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: `radial-gradient(circle, rgba(212, 175, 55, 0.08) 0%, transparent 70%)`,
                      transform: 'scale(1.3)',
                    }}
                  />

                  {/* Pointer triangle at top */}
                  <div
                    className="absolute z-20"
                    style={{
                      top: -2,
                      left: '50%',
                      transform: 'translateX(-50%)',
                    }}
                  >
                    <div
                      style={{
                        width: 0,
                        height: 0,
                        borderLeft: '14px solid transparent',
                        borderRight: '14px solid transparent',
                        borderTop: `26px solid ${GOLD}`,
                        filter: `drop-shadow(0 2px 6px rgba(212, 175, 55, 0.5))`,
                      }}
                    />
                  </div>

                  {/* Canvas */}
                  <canvas
                    ref={canvasRef}
                    style={{
                      width: canvasSize,
                      height: canvasSize,
                      borderRadius: '50%',
                    }}
                  />

                  {/* Center SPIN button */}
                  {phase === 'wheel' && (
                    <button
                      onClick={spin}
                      disabled={spinning}
                      className="absolute z-10 rounded-full flex items-center justify-center transition-all"
                      style={{
                        width: 68,
                        height: 68,
                        background: spinning
                          ? 'linear-gradient(180deg, #2a2318 0%, #1a1510 100%)'
                          : 'linear-gradient(180deg, #2a2318 0%, #1a1510 100%)',
                        border: `2px solid ${GOLD}`,
                        color: GOLD,
                        fontFamily: 'var(--font-cinzel)',
                        fontSize: 14,
                        fontWeight: 600,
                        letterSpacing: '0.1em',
                        cursor: spinning ? 'not-allowed' : 'pointer',
                        boxShadow: `0 0 15px rgba(212, 175, 55, 0.25), inset 0 1px 0 rgba(255,255,255,0.05)`,
                        opacity: spinning ? 0.6 : 1,
                      }}
                      onMouseEnter={(e) => {
                        if (!spinning) {
                          e.currentTarget.style.boxShadow = `0 0 25px rgba(212, 175, 55, 0.45), inset 0 1px 0 rgba(255,255,255,0.05)`;
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = `0 0 15px rgba(212, 175, 55, 0.25), inset 0 1px 0 rgba(255,255,255,0.05)`;
                      }}
                      aria-label="Spin the wheel"
                    >
                      SPIN
                    </button>
                  )}
                </motion.div>
              )}

              {/* ---------- RESULT ---------- */}
              {phase === 'result' && result && (
                <motion.div
                  className="mt-6 w-full flex flex-col items-center gap-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                >
                  {/* Prize text with shimmer */}
                  <div className="relative overflow-hidden rounded-lg px-6 py-3">
                    <p
                      className="text-center font-[var(--font-cinzel)] text-xl font-medium relative z-10"
                      style={{ color: GOLD }}
                    >
                      You won: {result.label}!
                    </p>
                    {/* Shimmer animation */}
                    <motion.div
                      className="absolute inset-0"
                      style={{
                        background: `linear-gradient(105deg, transparent 40%, rgba(212, 175, 55, 0.12) 50%, transparent 60%)`,
                      }}
                      animate={{ x: ['-100%', '200%'] }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        repeatDelay: 1,
                        ease: 'easeInOut',
                      }}
                    />
                  </div>

                  {/* Discount code */}
                  {result.code ? (
                    <div className="w-full max-w-[300px] flex flex-col items-center gap-2">
                      <p
                        className="text-xs font-[var(--font-sans)]"
                        style={{ color: 'rgba(255, 255, 255, 0.5)' }}
                      >
                        Your discount code
                      </p>
                      <div
                        className="w-full flex items-center justify-between rounded-lg px-4 py-3"
                        style={{
                          backgroundColor: 'rgba(255, 255, 255, 0.06)',
                          border: '1px solid rgba(212, 175, 55, 0.2)',
                        }}
                      >
                        <span
                          className="font-[var(--font-sans)] text-sm font-semibold tracking-widest select-all"
                          style={{ color: '#FFFFFF' }}
                        >
                          {result.code}
                        </span>
                        <button
                          onClick={copyCode}
                          className="ml-3 p-1.5 rounded-md transition-colors"
                          style={{
                            color: copied ? '#4A7C59' : 'rgba(255, 255, 255, 0.5)',
                            backgroundColor: copied ? 'rgba(74, 124, 89, 0.15)' : 'transparent',
                          }}
                          aria-label={copied ? 'Copied' : 'Copy code'}
                        >
                          {copied ? <Check size={16} /> : <Copy size={16} />}
                        </button>
                      </div>
                      {copied && (
                        <motion.p
                          className="text-xs font-[var(--font-sans)]"
                          style={{ color: '#4A7C59' }}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                        >
                          Copied to clipboard!
                        </motion.p>
                      )}
                    </div>
                  ) : (
                    <div className="w-full max-w-[300px] text-center">
                      <p
                        className="text-sm font-[var(--font-sans)]"
                        style={{ color: 'rgba(255, 255, 255, 0.7)' }}
                      >
                        Contact us to claim your free T-shirt!
                      </p>
                    </div>
                  )}

                  {/* Close / shop button */}
                  <button
                    onClick={close}
                    className="mt-2 rounded-lg px-8 py-2.5 text-sm font-semibold tracking-wider uppercase transition-all"
                    style={{
                      background: `linear-gradient(135deg, ${GOLD}, #B8972E)`,
                      color: '#1a1510',
                      fontFamily: 'var(--font-sans)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = `0 0 20px rgba(212, 175, 55, 0.35)`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    Start Shopping
                  </button>
                </motion.div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
