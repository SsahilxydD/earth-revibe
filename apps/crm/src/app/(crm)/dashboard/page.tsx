import { Card } from '@earth-revibe/ui';

export const metadata = { title: 'Dashboard' };

export default function CrmDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-charcoal">CRM Dashboard</h1>
        <p className="text-sm text-medium-gray mt-1">
          Customer engagement at a glance. More widgets land as features migrate from admin.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="text-xs text-medium-gray uppercase tracking-wide">Pending recovery</div>
          <div className="text-2xl font-semibold mt-1">—</div>
          <div className="text-xs text-text-muted mt-2">Wired when Abandoned Carts moves here</div>
        </Card>
        <Card>
          <div className="text-xs text-medium-gray uppercase tracking-wide">Inbound (24h)</div>
          <div className="text-2xl font-semibold mt-1">—</div>
          <div className="text-xs text-text-muted mt-2">Wired when Inbox lands</div>
        </Card>
        <Card>
          <div className="text-xs text-medium-gray uppercase tracking-wide">Read rate (7d)</div>
          <div className="text-2xl font-semibold mt-1">—</div>
          <div className="text-xs text-text-muted mt-2">Wired when Templates lands</div>
        </Card>
      </div>

      <Card>
        <h2 className="text-lg font-semibold text-charcoal">What lives here</h2>
        <ul className="mt-3 space-y-2 text-sm text-text-secondary">
          <li>
            <span className="font-medium text-text-primary">Customers</span> — searchable list and
            (next commit) the full 360 timeline per customer
          </li>
          <li>
            <span className="font-medium text-text-primary">Abandoned Carts</span> — moves over from
            admin
          </li>
          <li>
            <span className="font-medium text-text-primary">Broadcasts</span> — WhatsApp campaign
            tooling moves over from admin
          </li>
          <li>
            <span className="font-medium text-text-primary">Inbox</span> — inbound WhatsApp replies
            (V3)
          </li>
          <li>
            <span className="font-medium text-text-primary">Templates</span> — A/B variants + funnel
            performance (V5)
          </li>
        </ul>
      </Card>
    </div>
  );
}
