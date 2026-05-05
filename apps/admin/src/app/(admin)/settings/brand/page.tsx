'use client';

import { useState } from 'react';
import {
  Palette,
  Image,
  Type,
  Layout,
  ExternalLink,
  Link as LinkIcon,
  Eye,
  Save,
} from 'lucide-react';
import { Card, Button, Input, Badge } from '@earth-revibe/ui';
import { toast } from '@earth-revibe/ui/toast';

const BRAND_COLORS = [
  { name: 'Forest Green', hex: '#2D5A3D', token: 'primary' },
  { name: 'Deep Earth', hex: '#3A2D1F', token: 'secondary' },
  { name: 'Off White', hex: '#E8E0D4', token: 'accent' },
  { name: 'Charcoal', hex: '#1A1A1A', token: 'text' },
  { name: 'Warm White', hex: '#FAF9F7', token: 'background' },
];

export default function BrandAndThemePage() {
  // Social media links
  const [instagramUrl, setInstagramUrl] = useState('https://instagram.com/earthrevibe');
  const [facebookUrl, setFacebookUrl] = useState('');
  const [twitterUrl, setTwitterUrl] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [pinterestUrl, setPinterestUrl] = useState('');

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isValidUrl = (url: string) => {
    if (!url) return true;
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    const urls: Record<string, string> = {
      instagramUrl,
      facebookUrl,
      twitterUrl,
      youtubeUrl,
      pinterestUrl,
    };
    for (const [key, val] of Object.entries(urls)) {
      if (val && !isValidUrl(val)) {
        errs[key] = 'Enter a valid URL (e.g. https://...)';
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      toast.error('Please fix the validation errors');
      return;
    }
    setSaving(true);
    await new Promise((r) => setTimeout(r, 500));
    toast.success('Brand & theme settings saved');
    setSaving(false);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-charcoal">Brand & Theme</h2>
          <p className="text-sm text-medium-gray mt-0.5">
            Manage your brand identity, logos, and storefront theme
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save size={16} />
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </div>

      {/* Brand colors */}
      <Card>
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <Palette size={16} className="text-deep-earth" />
            <h3 className="text-sm font-semibold text-charcoal">Brand colors</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {BRAND_COLORS.map((color) => (
              <div key={color.hex} className="flex items-center gap-3 p-3 bg-off-white rounded-lg">
                <div
                  className="w-10 h-10 rounded-full border border-light-gray flex-shrink-0 shadow-sm"
                  style={{ backgroundColor: color.hex }}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-charcoal">{color.name}</p>
                  <p className="text-xs text-medium-gray font-mono">{color.hex}</p>
                </div>
                <span className="ml-auto text-xs text-medium-gray capitalize">{color.token}</span>
              </div>
            ))}
          </div>

          <p className="text-xs text-medium-gray">
            Brand colors are configured in the theme. Contact development to update.
          </p>
        </div>
      </Card>

      {/* Logo */}
      <Card>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Image size={16} className="text-deep-earth" />
            <h3 className="text-sm font-semibold text-charcoal">Logo</h3>
          </div>

          <div className="flex items-center justify-center w-full h-40 border-2 border-dashed border-light-gray rounded-lg bg-off-white/50">
            <div className="text-center">
              <Image size={32} className="mx-auto text-medium-gray mb-2" />
              <p className="text-sm text-medium-gray">Drop your logo here or click to upload</p>
              <p className="text-xs text-medium-gray mt-1">Recommended: 512x512px</p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 bg-off-white rounded-lg">
            <Eye size={14} className="text-medium-gray" />
            <span className="text-sm text-dark-gray">
              Current: Using text logo:{' '}
              <span className="font-semibold text-charcoal">Earth Revibe</span>
            </span>
          </div>

          <p className="text-xs text-medium-gray">
            Logo upload coming soon. Currently using a text-based logo.
          </p>
        </div>
      </Card>

      {/* Favicon */}
      <Card>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Image size={16} className="text-deep-earth" />
            <h3 className="text-sm font-semibold text-charcoal">Favicon</h3>
          </div>

          <div className="flex items-center justify-center w-full h-28 border-2 border-dashed border-light-gray rounded-lg bg-off-white/50">
            <div className="text-center">
              <Image size={24} className="mx-auto text-medium-gray mb-2" />
              <p className="text-sm text-medium-gray">Upload favicon</p>
              <p className="text-xs text-medium-gray mt-1">Recommended: 32x32px ICO or PNG</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Typography */}
      <Card>
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <Type size={16} className="text-deep-earth" />
            <h3 className="text-sm font-semibold text-charcoal">Typography</h3>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-off-white rounded-lg">
              <div>
                <p className="text-sm font-medium text-charcoal">Headings</p>
                <p className="text-xs text-medium-gray">Used for titles and section headers</p>
              </div>
              <span className="text-sm font-semibold text-charcoal">Poppins</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-off-white rounded-lg">
              <div>
                <p className="text-sm font-medium text-charcoal">Body</p>
                <p className="text-xs text-medium-gray">Used for paragraphs and general text</p>
              </div>
              <span className="text-sm font-semibold text-charcoal">Inter</span>
            </div>
          </div>

          <p className="text-xs text-medium-gray">
            Typography is managed in the theme configuration
          </p>
        </div>
      </Card>

      {/* Storefront theme */}
      <Card>
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <Layout size={16} className="text-deep-earth" />
            <h3 className="text-sm font-semibold text-charcoal">Storefront theme</h3>
          </div>

          <div className="p-4 bg-off-white rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-charcoal">Custom Theme</p>
                <Badge variant="success">Active</Badge>
              </div>
              <span className="text-xs text-medium-gray font-mono">v1.0.0</span>
            </div>
            <p className="text-sm text-dark-gray">
              Earth Revibe&apos;s custom-built Next.js storefront with sustainable fashion theming
            </p>
          </div>

          <a
            href="https://www.earthrevibe.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-deep-earth hover:text-deep-earth/80 transition-colors"
          >
            <ExternalLink size={14} />
            View storefront
          </a>

          <p className="text-xs text-medium-gray">
            Theme customization is handled through the codebase
          </p>
        </div>
      </Card>

      {/* Social media links */}
      <Card>
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <LinkIcon size={16} className="text-deep-earth" />
            <h3 className="text-sm font-semibold text-charcoal">Social media links</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Instagram"
              value={instagramUrl}
              onChange={(e) => {
                setInstagramUrl(e.target.value);
                if (errors.instagramUrl) setErrors((prev) => ({ ...prev, instagramUrl: '' }));
              }}
              placeholder="https://instagram.com/yourstore"
              error={errors.instagramUrl}
            />
            <Input
              label="Facebook"
              value={facebookUrl}
              onChange={(e) => {
                setFacebookUrl(e.target.value);
                if (errors.facebookUrl) setErrors((prev) => ({ ...prev, facebookUrl: '' }));
              }}
              placeholder="https://facebook.com/yourstore"
              error={errors.facebookUrl}
            />
            <Input
              label="Twitter/X"
              value={twitterUrl}
              onChange={(e) => {
                setTwitterUrl(e.target.value);
                if (errors.twitterUrl) setErrors((prev) => ({ ...prev, twitterUrl: '' }));
              }}
              placeholder="https://x.com/yourstore"
              error={errors.twitterUrl}
            />
            <Input
              label="YouTube"
              value={youtubeUrl}
              onChange={(e) => {
                setYoutubeUrl(e.target.value);
                if (errors.youtubeUrl) setErrors((prev) => ({ ...prev, youtubeUrl: '' }));
              }}
              placeholder="https://youtube.com/@yourstore"
              error={errors.youtubeUrl}
            />
          </div>

          <Input
            label="Pinterest"
            value={pinterestUrl}
            onChange={(e) => {
              setPinterestUrl(e.target.value);
              if (errors.pinterestUrl) setErrors((prev) => ({ ...prev, pinterestUrl: '' }));
            }}
            placeholder="https://pinterest.com/yourstore"
            error={errors.pinterestUrl}
          />

          <p className="text-xs text-medium-gray">
            These links appear in your store footer and can be used across the storefront
          </p>
        </div>
      </Card>
    </div>
  );
}
