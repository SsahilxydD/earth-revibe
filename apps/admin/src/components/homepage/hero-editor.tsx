'use client';

import { useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  homepageHeroContentSchema,
  type HomepageHeroContent,
  type HomepageBlockRecord,
} from '@earth-revibe/shared';
import { Button, Input } from '@earth-revibe/ui';
import { toast } from '@earth-revibe/ui/toast';
import { useUpsertHero } from '@/hooks/use-homepage';
import { ImagePicker } from './image-picker';

const EMPTY: HomepageHeroContent = {
  imageUrl: '',
  kicker: '',
  headline: '',
  headlineItalic: '',
  ctaLabel: '',
  ctaHref: '/products',
};

export function HeroEditor({ blocks }: { blocks: HomepageBlockRecord[] }) {
  const heroBlock = blocks.find((b) => b.type === 'HERO');
  const saved = useMemo(() => {
    if (!heroBlock) return null;
    const parsed = homepageHeroContentSchema.safeParse(heroBlock.content);
    return parsed.success ? parsed.data : null;
  }, [heroBlock]);

  const upsertHero = useUpsertHero();

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<HomepageHeroContent>({
    resolver: zodResolver(homepageHeroContentSchema) as any,
    defaultValues: saved ?? EMPTY,
  });

  // Sync the form once the blocks query lands (or after another tab saved).
  useEffect(() => {
    if (saved) reset(saved);
  }, [saved, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      await upsertHero.mutateAsync(values);
      toast.success('Hero saved — live on the storefront');
      reset(values);
    } catch {
      toast.error('Failed to save hero');
    }
  });

  return (
    <form onSubmit={onSubmit} className="rounded-lg border border-stone-200 bg-white p-4 space-y-4">
      {!heroBlock && (
        <p className="rounded bg-stone-50 px-3 py-2 text-[12px] text-medium-gray">
          The storefront is showing its built-in hero. Save one here to take over.
        </p>
      )}

      <Controller
        control={control}
        name="imageUrl"
        render={({ field }) => (
          <div>
            <p className="mb-1 text-[13px] font-medium text-[#303030]">Cover image</p>
            <ImagePicker value={field.value} onChange={field.onChange} frameClass="h-40 w-24" />
            {errors.imageUrl && (
              <p className="mt-1 text-[12px] text-[#d72c0d]">Cover image is required</p>
            )}
            <p className="mt-1 text-[12px] text-[#616161]">
              Portrait, ~9:16 — it renders full-bleed on mobile.
            </p>
          </div>
        )}
      />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Input
          label="Kicker"
          placeholder="NEW ARRIVALS · MONSOON EDIT"
          {...register('kicker')}
          error={errors.kicker?.message}
        />
        <div />
        <Input
          label="Headline (line 1)"
          placeholder="Wear it like"
          {...register('headline')}
          error={errors.headline?.message}
        />
        <Input
          label="Headline (line 2, italic)"
          placeholder="you’re already there."
          {...register('headlineItalic')}
          error={errors.headlineItalic?.message}
        />
        <Input
          label="CTA label"
          placeholder="EXPLORE THE EDIT"
          {...register('ctaLabel')}
          error={errors.ctaLabel?.message}
        />
        <Input
          label="CTA link"
          placeholder="/products"
          {...register('ctaHref')}
          error={errors.ctaHref?.message}
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" size="sm" isLoading={upsertHero.isPending} disabled={!isDirty}>
          Save hero
        </Button>
      </div>
    </form>
  );
}
