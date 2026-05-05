'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, GitBranchPlus, ShoppingCart, Layout, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useFunnelStore } from '@/stores/funnel-store';
import { Button } from '@earth-revibe/ui';

const TEMPLATES = [
  {
    id: 'ecommerce',
    name: 'E-commerce Purchase Flow',
    description: 'Track the complete purchase journey from product view to checkout',
    icon: ShoppingCart,
    steps: ['trigger', 'view_item', 'add_to_cart', 'begin_checkout', 'purchase'] as const,
    color: '#22c55e',
  },
  {
    id: 'browse',
    name: 'Browse & Engage',
    description: 'Monitor how visitors explore your site and products',
    icon: Layout,
    steps: ['trigger', 'page_visit', 'view_item', 'search', 'add_to_cart'] as const,
    color: '#3b82f6',
  },
  {
    id: 'blank',
    name: 'Start from Scratch',
    description: 'Build a completely custom funnel with your own steps',
    icon: Sparkles,
    steps: ['trigger'] as const,
    color: '#a855f7',
  },
];

export default function CreateFunnelPage() {
  const router = useRouter();
  const createFunnel = useFunnelStore((s) => s.createFunnel);
  const addNode = useFunnelStore((s) => s.addNode);
  const addEdge = useFunnelStore((s) => s.addEdge);

  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const handleCreate = () => {
    if (!name.trim()) return;

    const funnelId = createFunnel(name.trim(), description.trim() || undefined);

    // If a template other than blank is selected, add those steps
    const template = TEMPLATES.find((t) => t.id === selectedTemplate);
    if (template && template.id !== 'blank') {
      // Add nodes for each step (skip trigger since createFunnel already adds it)
      for (let i = 1; i < template.steps.length; i++) {
        addNode(template.steps[i], { x: 100 + i * 300, y: 200 });
      }

      // Connect nodes sequentially
      const updatedNodes = useFunnelStore.getState().nodes;
      for (let i = 0; i < updatedNodes.length - 1; i++) {
        addEdge({
          id: `edge_${updatedNodes[i].id}_${updatedNodes[i + 1].id}`,
          source: updatedNodes[i].id,
          target: updatedNodes[i + 1].id,
          type: 'funnelEdge',
          animated: true,
        });
      }

      // Save the funnel with the new nodes/edges
      useFunnelStore.getState().saveFunnel();
    }

    router.push(`/funnels/${funnelId}`);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/funnels"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:bg-surface transition-colors"
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-text-primary font-heading">Create Funnel</h1>
          <p className="text-sm text-text-secondary">
            Step {step} of 2 — {step === 1 ? 'Name your funnel' : 'Choose a template'}
          </p>
        </div>
      </div>

      {/* Progress */}
      <div className="flex gap-2">
        <div className={`h-1 flex-1 rounded-full ${step >= 1 ? 'bg-accent' : 'bg-border'}`} />
        <div className={`h-1 flex-1 rounded-full ${step >= 2 ? 'bg-accent' : 'bg-border'}`} />
      </div>

      {/* Step 1: Name & Description */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-surface p-6">
            <label className="block text-sm font-medium text-text-primary">Funnel Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Purchase Funnel, Browse to Buy..."
              className="mt-2 w-full rounded-lg border border-border bg-transparent px-4 py-3 text-text-primary placeholder:text-text-secondary/50 outline-none focus:border-accent"
              autoFocus
            />

            <label className="mt-6 block text-sm font-medium text-text-primary">
              Description <span className="text-text-secondary font-normal">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this funnel track?"
              rows={3}
              className="mt-2 w-full rounded-lg border border-border bg-transparent px-4 py-3 text-text-primary placeholder:text-text-secondary/50 outline-none focus:border-accent resize-none"
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={() => setStep(2)} disabled={!name.trim()}>
              Next <ArrowRight size={16} />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Choose Template */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="grid gap-4">
            {TEMPLATES.map((template) => (
              <button
                key={template.id}
                onClick={() => setSelectedTemplate(template.id)}
                className={`flex items-start gap-4 rounded-xl border p-5 text-left transition-all ${
                  selectedTemplate === template.id
                    ? 'border-accent bg-accent/5 shadow-lg shadow-accent/10'
                    : 'border-border bg-surface hover:border-border hover:bg-surface/80'
                }`}
              >
                <div
                  className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${template.color}15` }}
                >
                  <template.icon size={24} style={{ color: template.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-text-primary">{template.name}</h3>
                  <p className="mt-0.5 text-sm text-text-secondary">{template.description}</p>
                  {template.id !== 'blank' && (
                    <div className="mt-2 flex items-center gap-1">
                      {template.steps.map((s, i) => (
                        <span key={s} className="flex items-center gap-1">
                          {i > 0 && <ArrowRight size={10} className="text-text-secondary/30" />}
                          <span className="rounded-md bg-surface px-1.5 py-0.5 text-[10px] text-text-secondary border border-border">
                            {s.replace('_', ' ')}
                          </span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {selectedTemplate === template.id && (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-white text-xs">
                    ✓
                  </div>
                )}
              </button>
            ))}
          </div>

          <div className="flex justify-between">
            <Button variant="secondary" onClick={() => setStep(1)}>
              <ArrowLeft size={16} /> Back
            </Button>
            <Button onClick={handleCreate} disabled={!selectedTemplate}>
              <GitBranchPlus size={16} /> Create Funnel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
