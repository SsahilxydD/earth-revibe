'use client';

import { useState } from 'react';
import { Globe, Lock, Search, Share2, FileCode, ExternalLink, Copy, Eye, Save } from 'lucide-react';
import { Card, Button, Input, Badge, Textarea } from '@earth-revibe/ui';
import { toast } from '@earth-revibe/ui/toast';

function Toggle({ checked, onChange }: { checked: boolean; onChange: (val: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-deep-earth/20 focus:ring-offset-1 ${
        checked ? 'bg-forest-green' : 'bg-light-gray'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

const ROBOTS_TXT_PREVIEW = `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /checkout/
Disallow: /account/

Sitemap: https://www.earthrevibe.com/sitemap.xml`;

export default function DomainsAndSEOPage() {
  // SEO fields
  const [pageTitle, setPageTitle] = useState(
    'Earth Revibe — Sustainable Fashion for a Better Tomorrow'
  );
  const [metaDescription, setMetaDescription] = useState(
    'Shop eco-friendly, sustainable clothing at Earth Revibe. Premium quality organic cotton t-shirts, hoodies, and accessories that are good for you and the planet.'
  );

  // Social media
  const [ogImageUrl, setOgImageUrl] = useState('');
  const [facebookUrl, setFacebookUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('https://instagram.com/earthrevibe');
  const [twitterUrl, setTwitterUrl] = useState('');

  // Robots & Sitemap
  const [allowIndexing, setAllowIndexing] = useState(true);

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 500));
    toast.success('Domains & SEO settings saved');
    setSaving(false);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const META_DESC_MAX = 160;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-charcoal">Domains & SEO</h2>
          <p className="text-sm text-medium-gray mt-0.5">
            Manage your domain, search engine optimization, and social sharing
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save size={16} />
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </div>

      {/* Primary domain */}
      <Card>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Globe size={16} className="text-deep-earth" />
            <h3 className="text-sm font-semibold text-charcoal">Primary domain</h3>
          </div>

          <div className="flex items-center justify-between p-3 bg-off-white rounded-lg">
            <div className="flex items-center gap-3">
              <Globe size={16} className="text-forest-green" />
              <span className="text-sm font-medium text-charcoal">www.earthrevibe.com</span>
              <Badge variant="success">Primary</Badge>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 bg-off-white rounded-lg">
            <Lock size={14} className="text-forest-green" />
            <span className="text-sm text-dark-gray">SSL secured</span>
            <Badge variant="success">Active</Badge>
          </div>

          <p className="text-xs text-medium-gray">
            Your primary domain is where customers visit your store
          </p>
        </div>
      </Card>

      {/* Domain management */}
      <Card>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <ExternalLink size={16} className="text-deep-earth" />
            <h3 className="text-sm font-semibold text-charcoal">Domain management</h3>
          </div>

          <div className="border border-light-gray rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-off-white border-b border-light-gray">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-dark-gray uppercase tracking-wider">
                    Domain
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-dark-gray uppercase tracking-wider">
                    Type
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-dark-gray uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-light-gray">
                <tr>
                  <td className="px-4 py-3 text-charcoal font-medium">earthrevibe.com</td>
                  <td className="px-4 py-3 text-medium-gray">Redirects to primary</td>
                  <td className="px-4 py-3">
                    <Badge variant="success">Active</Badge>
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-charcoal font-medium">www.earthrevibe.com</td>
                  <td className="px-4 py-3 text-medium-gray">Primary domain</td>
                  <td className="px-4 py-3">
                    <Badge variant="success">Active</Badge>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div>
            <Button disabled className="opacity-50 cursor-not-allowed">
              Add domain
            </Button>
            <p className="text-xs text-medium-gray mt-2">
              Domain management coming soon. Domains are managed through your hosting provider.
            </p>
          </div>
        </div>
      </Card>

      {/* Homepage SEO */}
      <Card>
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <Search size={16} className="text-deep-earth" />
            <h3 className="text-sm font-semibold text-charcoal">Homepage SEO</h3>
          </div>

          <Input
            label="Page title"
            value={pageTitle}
            onChange={(e) => setPageTitle(e.target.value)}
            placeholder="Your store's page title"
          />

          <div>
            <Textarea
              label="Meta description"
              value={metaDescription}
              onChange={(e) => {
                if (e.target.value.length <= META_DESC_MAX) {
                  setMetaDescription(e.target.value);
                }
              }}
              placeholder="Describe your store in 160 characters or less"
              rows={3}
            />
            <p
              className={`text-xs mt-1 text-right ${
                metaDescription.length >= META_DESC_MAX
                  ? 'text-error'
                  : metaDescription.length >= META_DESC_MAX - 20
                    ? 'text-warning'
                    : 'text-medium-gray'
              }`}
            >
              {metaDescription.length}/{META_DESC_MAX} characters
            </p>
          </div>

          {/* Google SERP Preview */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Eye size={14} className="text-medium-gray" />
              <p className="text-xs font-semibold text-dark-gray uppercase tracking-wider">
                Search preview
              </p>
            </div>
            <div className="p-4 border border-light-gray rounded-lg bg-white">
              <p className="text-lg text-[#1a0dab] leading-snug truncate hover:underline cursor-default">
                {pageTitle || 'Page Title'}
              </p>
              <p className="text-sm text-[#006621] mt-0.5">https://www.earthrevibe.com</p>
              <p className="text-sm text-[#545454] mt-1 line-clamp-2">
                {metaDescription || 'Meta description will appear here...'}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Social media */}
      <Card>
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <Share2 size={16} className="text-deep-earth" />
            <h3 className="text-sm font-semibold text-charcoal">Social media</h3>
          </div>

          <Input
            label="Social share image URL"
            value={ogImageUrl}
            onChange={(e) => setOgImageUrl(e.target.value)}
            placeholder="https://www.earthrevibe.com/og-image.jpg"
            helperText="Used as the Open Graph image when your site is shared on social media"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Facebook page URL"
              value={facebookUrl}
              onChange={(e) => setFacebookUrl(e.target.value)}
              placeholder="https://facebook.com/earthrevibe"
            />
            <Input
              label="Instagram URL"
              value={instagramUrl}
              onChange={(e) => setInstagramUrl(e.target.value)}
              placeholder="https://instagram.com/earthrevibe"
            />
          </div>

          <Input
            label="Twitter/X URL"
            value={twitterUrl}
            onChange={(e) => setTwitterUrl(e.target.value)}
            placeholder="https://x.com/earthrevibe"
          />

          <p className="text-xs text-medium-gray">
            These are used for social sharing metadata and can appear in the website footer
          </p>
        </div>
      </Card>

      {/* Robots & Sitemap */}
      <Card>
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <FileCode size={16} className="text-deep-earth" />
            <h3 className="text-sm font-semibold text-charcoal">Robots & Sitemap</h3>
          </div>

          <div className="flex items-center justify-between gap-4 py-2">
            <div className="min-w-0">
              <p className="text-sm font-medium text-charcoal">Allow search engine indexing</p>
              <p className="text-xs text-medium-gray mt-0.5">
                When enabled, search engines like Google can index your store
              </p>
            </div>
            <Toggle checked={allowIndexing} onChange={setAllowIndexing} />
          </div>

          <div className="flex items-center justify-between p-3 bg-off-white rounded-lg">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-dark-gray uppercase tracking-wider mb-1">
                Sitemap URL
              </p>
              <p className="text-sm text-charcoal font-mono">www.earthrevibe.com/sitemap.xml</p>
            </div>
            <button
              onClick={() => handleCopy('https://www.earthrevibe.com/sitemap.xml')}
              className="p-2 hover:bg-light-gray rounded-lg transition-colors flex-shrink-0"
              title="Copy sitemap URL"
            >
              <Copy size={14} className="text-dark-gray" />
            </button>
          </div>

          <div>
            <p className="text-xs font-semibold text-dark-gray uppercase tracking-wider mb-2">
              Robots.txt
            </p>
            <pre className="p-3 bg-off-white rounded-lg text-xs text-dark-gray font-mono whitespace-pre-wrap border border-light-gray overflow-x-auto">
              {ROBOTS_TXT_PREVIEW}
            </pre>
          </div>

          <p className="text-xs text-medium-gray">
            Search engine settings affect how your store appears in Google and other search engines
          </p>
        </div>
      </Card>
    </div>
  );
}
