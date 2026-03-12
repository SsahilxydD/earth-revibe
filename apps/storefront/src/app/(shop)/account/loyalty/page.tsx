"use client";

import { useQuery } from "@tanstack/react-query";
import { Star, TrendingUp, ShoppingBag, Gift } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";

interface LoyaltyData {
  balance: number;
  tier: string;
  totalEarned: number;
  totalRedeemed: number;
  transactions: LoyaltyTransaction[];
}

interface LoyaltyTransaction {
  id: string;
  type: "earn" | "redeem" | "expire" | "bonus";
  points: number;
  description: string;
  createdAt: string;
}

const TYPE_STYLES: Record<string, { color: string; prefix: string }> = {
  earn: { color: "text-green-600", prefix: "+" },
  bonus: { color: "text-green-600", prefix: "+" },
  redeem: { color: "text-[var(--color-sale)]", prefix: "-" },
  expire: { color: "text-[var(--color-muted)]", prefix: "-" },
};

const HOW_IT_WORKS = [
  {
    icon: ShoppingBag,
    title: "Shop & Earn",
    description: "Earn 1 point for every Rs.10 spent on eligible purchases.",
  },
  {
    icon: Gift,
    title: "Redeem Rewards",
    description: "Use your points at checkout. 100 points = Rs.10 discount.",
  },
  {
    icon: TrendingUp,
    title: "Level Up",
    description: "Higher tiers unlock bonus multipliers and exclusive perks.",
  },
] as const;

export default function LoyaltyPage() {
  const { data: loyalty, isLoading } = useQuery({
    queryKey: ["loyalty"],
    queryFn: () => api.get<LoyaltyData>("/loyalty"),
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  const balance = loyalty?.balance ?? 0;
  const tier = loyalty?.tier ?? "Bronze";
  const transactions = loyalty?.transactions ?? [];

  return (
    <div className="space-y-8">
      {/* Balance Card */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-primary)] p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider opacity-70">
              Available Points
            </p>
            <p className="mt-1 text-4xl font-bold tracking-tight">
              {balance.toLocaleString("en-IN")}
            </p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
            <Star size={20} className="text-[var(--color-star)]" />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-4 border-t border-white/20 pt-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider opacity-70">
              Tier
            </p>
            <p className="text-sm font-bold">{tier}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider opacity-70">
              Total Earned
            </p>
            <p className="text-sm font-bold">
              {(loyalty?.totalEarned ?? 0).toLocaleString("en-IN")}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider opacity-70">
              Total Redeemed
            </p>
            <p className="text-sm font-bold">
              {(loyalty?.totalRedeemed ?? 0).toLocaleString("en-IN")}
            </p>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div>
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wider">
          How It Works
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {HOW_IT_WORKS.map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-[var(--color-border)] p-5"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-surface)]">
                <item.icon size={20} className="text-[var(--color-primary)]" />
              </div>
              <h4 className="text-sm font-bold">{item.title}</h4>
              <p className="mt-1 text-xs text-[var(--color-muted)]">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Transaction History */}
      <div>
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wider">
          Transaction History
        </h3>
        {transactions.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">
            No transactions yet. Start shopping to earn points.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="pb-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                    Date
                  </th>
                  <th className="pb-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                    Type
                  </th>
                  <th className="pb-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                    Description
                  </th>
                  <th className="pb-3 text-right text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                    Points
                  </th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => {
                  const style = TYPE_STYLES[tx.type] || TYPE_STYLES.earn;
                  return (
                    <tr
                      key={tx.id}
                      className="border-b border-[var(--color-border)] last:border-b-0"
                    >
                      <td className="py-3 text-[var(--color-muted)]">
                        {formatDate(tx.createdAt)}
                      </td>
                      <td className="py-3">
                        <span className="rounded-[var(--badge-radius)] bg-[var(--color-surface)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                          {tx.type}
                        </span>
                      </td>
                      <td className="py-3">{tx.description}</td>
                      <td className={`py-3 text-right font-bold ${style.color}`}>
                        {style.prefix}
                        {tx.points.toLocaleString("en-IN")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
