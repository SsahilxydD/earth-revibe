'use client';

import { Card } from '@/components/ui';

interface Product {
  name: string;
  quantity: number;
  revenue: number;
}

function formatINR(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

export function TopProducts({ products }: { products: Product[] }) {
  const maxQty = Math.max(...products.map((p) => p.quantity), 1);

  return (
    <Card padding={false}>
      <div className="px-5 py-4 border-b border-light-gray">
        <h3 className="text-sm font-semibold text-charcoal">Top products</h3>
      </div>
      {products.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-medium-gray">
          No product data for this period
        </div>
      ) : (
        <div className="divide-y divide-light-gray">
          {products.map((product, i) => (
            <div key={product.name} className="px-5 py-3 flex items-center gap-4">
              <span className="text-xs font-medium text-medium-gray w-5 text-right">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-charcoal truncate">{product.name}</p>
                <div className="mt-1.5 flex items-center gap-3">
                  <div className="flex-1 h-1.5 bg-off-white rounded-full overflow-hidden">
                    <div
                      className="h-full bg-deep-earth/70 rounded-full transition-all"
                      style={{ width: `${(product.quantity / maxQty) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-medium-gray whitespace-nowrap">
                    {product.quantity} sold
                  </span>
                </div>
              </div>
              <span className="text-sm font-medium text-charcoal whitespace-nowrap">
                {formatINR(product.revenue)}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
