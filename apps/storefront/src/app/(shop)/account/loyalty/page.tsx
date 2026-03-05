"use client";

import { useState } from "react";
import { Star, TrendingUp, TrendingDown, Gift } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Button, Card, Badge } from "@/components/ui";
import { Skeleton } from "@/components/ui/skeleton";

const typeVariant: Record<string, "success" | "error" | "info" | "warning" | "default"> = {
  EARNED: "success",
  REDEEMED: "error",
  BONUS: "info",
  EXPIRED: "warning",
  ADJUSTED: "default",
};

const typeLabel: Record<string, string> = {
  EARNED: "Earned",
  REDEEMED: "Redeemed",
  BONUS: "Bonus",
  EXPIRED: "Expired",
  ADJUSTED: "Adjusted",
};

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function LoyaltyPage() {
  const [page, setPage] = useState(1);

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["loyalty-summary"],
    queryFn: () => api.get("/loyalty/summary"),
  });

  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ["loyalty-history", page],
    queryFn: () => api.get(`/loyalty/history?page=${page}&limit=15`),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-charcoal">Loyalty Points</h1>

      {/* Stats */}
      {summaryLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-forest-green/10 flex items-center justify-center">
                <Star size={20} className="text-forest-green" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-charcoal">{summary?.currentBalance || 0}</p>
                <p className="text-xs text-medium-gray">Current Balance</p>
              </div>
            </div>
            <p className="text-xs text-medium-gray mt-2">
              Worth ₹{summary?.currentBalance || 0} on your next order
            </p>
          </Card>
          <Card>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <TrendingUp size={20} className="text-success" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-charcoal">{summary?.totalEarned || 0}</p>
                <p className="text-xs text-medium-gray">Total Earned</p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <TrendingDown size={20} className="text-warning" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-charcoal">{summary?.totalRedeemed || 0}</p>
                <p className="text-xs text-medium-gray">Total Redeemed</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* How it works */}
      <Card>
        <h3 className="text-base font-semibold text-charcoal mb-3">How It Works</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div className="flex items-start gap-2">
            <Gift size={16} className="text-forest-green mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-charcoal">Earn Points</p>
              <p className="text-medium-gray">1 point for every ₹100 spent</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Star size={16} className="text-forest-green mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-charcoal">Redeem</p>
              <p className="text-medium-gray">1 point = ₹1 discount at checkout</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <TrendingUp size={16} className="text-forest-green mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-charcoal">Bonus</p>
              <p className="text-medium-gray">Extra points for referrals</p>
            </div>
          </div>
        </div>
      </Card>

      {/* History */}
      <Card>
        <h3 className="text-base font-semibold text-charcoal mb-4">Points History</h3>
        {historyLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !history?.transactions?.length ? (
          <p className="text-sm text-medium-gray py-4">No transactions yet. Start shopping to earn points!</p>
        ) : (
          <>
            <div className="space-y-3">
              {history.transactions.map((tx: any) => (
                <div key={tx.id} className="flex items-center justify-between py-2 border-b border-light-gray last:border-0">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={typeVariant[tx.type] || "default"}>
                        {typeLabel[tx.type] || tx.type}
                      </Badge>
                      <span className="text-xs text-medium-gray">{formatDate(tx.createdAt)}</span>
                    </div>
                    <p className="text-sm text-dark-gray mt-1">{tx.description}</p>
                  </div>
                  <span className={`font-semibold ${tx.points > 0 ? "text-success" : "text-error"}`}>
                    {tx.points > 0 ? "+" : ""}{tx.points}
                  </span>
                </div>
              ))}
            </div>

            {history.totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-light-gray">
                <p className="text-xs text-medium-gray">
                  Page {history.page} of {history.totalPages}
                </p>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                    Previous
                  </Button>
                  <Button variant="ghost" size="sm" disabled={page >= history.totalPages} onClick={() => setPage((p) => p + 1)}>
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
