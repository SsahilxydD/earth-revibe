import { CopyButton } from '@/components/copy-button';
import { Gate } from '@/components/gate/gate';

const PROMPT_JSON = `{
  "shot": "first-person POV, front-facing phone camera held at chest height, tilted slightly downward toward the torso",
  "framing": "subject visible from upper chest to mid-thigh, hands relaxed at sides, full shirt in frame, vertical 9:16 composition",
  "subject": "young man wearing the exact shirt and pants shown in the start frame — preserve stripe pattern, color, button placement, pocket detail, sleeve roll, and watch on left wrist with no drift",
  "action": "subject takes slow natural steps forward on a paved street, gentle body sway, shirt fabric moves softly with each step, left arm swings briefly into frame revealing the leather watch strap",
  "camera": "handheld phone POV with subtle organic micro-shake, no zoom, no pan, holds steady framing on the torso, mimics real selfie-mode walking footage",
  "environment": "outdoor urban pavement, soft warm late-afternoon daylight, gentle directional shadow, neutral concrete tone underfoot, shallow background blur",
  "style": "realistic smartphone front-camera footage, natural color grading, slight lens compression typical of phone selfie cam, no cinematic filters or LUTs"
}`;

const OUTPUT_CONTROLS = [
  { label: 'Resolution', value: '1080p', note: 'Max quality, vertical' },
  { label: 'Duration', value: '5s', note: 'Single continuous clip' },
  { label: 'Scenes', value: '1', note: 'No cuts, no transitions' },
  { label: 'Audio', value: 'Off', note: 'Cleaner for B-roll' },
];

const STEPS = [
  {
    n: '01',
    title: 'Prepare the reference image',
    body: 'Upload a clear photo of yourself wearing the shirt — selfie or POV angle, framed from upper chest to mid-thigh, phone tilted slightly down. The output mirrors the start frame, so frame the shirt as you want the final clip to look.',
  },
  {
    n: '02',
    title: 'Open Higgsfield',
    body: 'Go to higgsfield.ai/create/video and pick Kling 3.0 from the model selector. The other models won’t respect the start-frame aspect ratio the same way.',
    link: { label: 'higgsfield.ai/create/video', href: 'https://higgsfield.ai/create/video' },
  },
  {
    n: '03',
    title: 'Drop the image into Start Frame',
    body: 'Leave End Frame empty. Adding an end frame forces a transition — we want natural ambient motion, not a morph between two stills.',
  },
  {
    n: '04',
    title: 'Set output controls',
    body: 'Use the values below. Audio stays off for try-on B-roll; turn it on only if you want ambient street sound in the final clip.',
    controls: true,
  },
  {
    n: '05',
    title: 'Paste the prompt',
    body: 'Copy the structured prompt below and paste into Higgsfield’s prompt box. Kling 3.0 parses the JSON-style structure cleanly — you don’t need to convert it to flowing prose.',
    prompt: true,
  },
  {
    n: '06',
    title: 'Generate',
    body: 'Hit generate. Typical render time is 30–90 seconds. Higgsfield will queue if traffic is heavy — leave the tab open.',
  },
  {
    n: '07',
    title: 'Polish on Canvas (optional)',
    body: 'Once the clip generates, place it on the Higgsfield canvas as a base layer. Add overlays, color correction, or stitch multiple clips together, then export the final.',
  },
];

export default function Page() {
  return (
    <Gate>
    <main className="min-h-dvh w-full max-w-full overflow-x-hidden bg-white">
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b border-[var(--color-border)] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--color-primary)]">
            Earth Revibe
          </span>
          <span className="text-[10px] font-medium uppercase tracking-[0.3em] text-[var(--color-muted)]">
            AI Try-On Guide
          </span>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-[var(--color-border)]">
        <div className="mx-auto max-w-3xl px-6 py-20 md:py-28">
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--color-muted)]">
            Tutorial &mdash; Higgsfield &times; Kling 3.0
          </p>
          <h1 className="mt-5 text-3xl font-bold uppercase leading-[1.1] tracking-[0.05em] text-[var(--color-primary)] md:text-5xl">
            Make your own
            <br />
            try-on reel.
          </h1>
          <p className="mt-6 max-w-xl text-sm leading-[1.8] text-[var(--color-muted)] md:text-base">
            Upload one photo of yourself wearing the shirt. Get a 5-second cinematic walking
            POV clip. The whole flow takes about three minutes once your reference image is ready.
          </p>
        </div>
      </section>

      {/* Critical callout — 9:16 warning */}
      <section className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="mx-auto max-w-3xl px-6 py-10 md:py-12">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-8">
            <p className="shrink-0 text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--color-warn)] md:w-32">
              Critical
            </p>
            <div className="flex-1">
              <h2 className="break-words text-sm font-bold uppercase tracking-[0.1em] text-[var(--color-primary)] sm:text-base md:text-lg">
                Your reference image must be 9:16
              </h2>
              <p className="mt-3 text-sm leading-[1.8] text-[var(--color-muted)]">
                Higgsfield&apos;s Kling integration uses your start frame&apos;s aspect ratio for
                the entire clip. If your photo is 1:1 or 4:5, the output will be too. Crop to{' '}
                <span className="font-medium text-[var(--color-primary)]">1080&times;1920 (9:16)</span>{' '}
                before uploading &mdash; this is the single most common failure point.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Steps */}
      <section>
        <div className="mx-auto max-w-3xl px-6 py-16 md:py-20">
          <ol className="space-y-14 md:space-y-20">
            {STEPS.map((step) => (
              <li
                key={step.n}
                className="grid grid-cols-1 gap-5 md:grid-cols-[120px_minmax(0,1fr)] md:gap-10"
              >
                <div className="text-4xl font-bold leading-none tracking-tight text-[var(--color-primary)] md:text-6xl">
                  {step.n}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold uppercase tracking-[0.15em] text-[var(--color-primary)] md:text-base">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-sm leading-[1.8] text-[var(--color-muted)]">
                    {step.body}
                  </p>

                  {step.link ? (
                    <a
                      href={step.link.href}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="mt-5 inline-block border-b border-[var(--color-primary)] pb-0.5 text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-primary)] transition-opacity hover:opacity-60"
                    >
                      {step.link.label} &rarr;
                    </a>
                  ) : null}

                  {step.controls ? (
                    <div className="mt-6 grid w-full max-w-full grid-cols-2 border-l border-t border-[var(--color-border)] md:grid-cols-4">
                      {OUTPUT_CONTROLS.map((c) => (
                        <div
                          key={c.label}
                          className="min-w-0 border-b border-r border-[var(--color-border)] p-3 md:p-4"
                        >
                          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--color-muted)]">
                            {c.label}
                          </p>
                          <p className="mt-2 text-base font-bold tracking-tight text-[var(--color-primary)]">
                            {c.value}
                          </p>
                          <p className="mt-1 break-words text-[11px] leading-snug text-[var(--color-muted)]">
                            {c.note}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {step.prompt ? (
                    <div className="mt-6 w-full min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5">
                        <span className="min-w-0 shrink text-[9px] font-bold uppercase tracking-[0.25em] text-[var(--color-muted)]">
                          Prompt
                        </span>
                        <CopyButton text={PROMPT_JSON} />
                      </div>
                      <pre className="w-full max-w-full overflow-x-auto overscroll-x-contain border border-t-0 border-[var(--color-border)] bg-white p-4 text-[12px] leading-[1.7] text-[var(--color-primary)]">
                        <code className="font-mono">{PROMPT_JSON}</code>
                      </pre>
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--color-border)]">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 px-6 py-8 text-center md:flex-row md:text-left">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--color-primary)]">
            Earth Revibe
          </p>
          <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-[var(--color-muted)]">
            Render time: ~30&ndash;90 seconds &middot; Higgsfield + Kling 3.0
          </p>
        </div>
      </footer>
    </main>
    </Gate>
  );
}
