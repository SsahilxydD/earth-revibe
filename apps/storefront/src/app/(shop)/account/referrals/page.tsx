"use client";

import { useState } from "react";
import { Gift, Users, Copy, Check, ShoppingBag } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { Button, Card, Badge } from "@/components/ui";
import { toast } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";

const statusVariant: Record<string, "success" | "warning" | "info"> = {
  SIGNED_UP: "info",
  CONVERTED: "success",
  PENDING: "warning",
};

const statusLabel: Record<string, string> = {
  SIGNED_UP: "Signed Up",
  CONVERTED: "Purchased",
  PENDING: "Pending",
};

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function ReferralsPage() {
  const { user } = useAuthStore();
  const [copied, setCopied] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["my-referrals"],
    queryFn: () => api.get("/referrals/my-referrals"),
  });

  const referralCode = user?.referralCode || "";
  const referralLink = typeof window !== "undefined"
    ? `${window.location.origin}/auth/register?ref=${referralCode}`
    : "";

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-charcoal">Referrals</h1>

      {/* Referral code */}
      <Card>
        <h3 className="text-base font-semibold text-charcoal mb-3">Your Referral Code</h3>
        <p className="text-sm text-medium-gray mb-4">
          Share your code with friends. When they sign up and make their first purchase, you both earn loyalty points!
        </p>
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-off-white rounded-lg px-4 py-3 font-mono text-lg font-semibold text-forest-green text-center">
            {referralCode || "—"}
          </div>
          <Button
            variant="secondary"
            onClick={() => handleCopy(referralCode)}
            disabled={!referralCode}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
        {referralLink && (
          <div className="mt-3">
            <p className="text-xs text-medium-gray mb-1">Or share this link:</p>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={referralLink}
                className="flex-1 text-xs px-3 py-2 rounded-lg border border-light-gray bg-off-white text-dark-gray"
              />
              <Button variant="ghost" size="sm" onClick={() => handleCopy(referralLink)}>
                <Copy size={14} />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Rewards info */}
      <Card>
        <h3 className="text-base font-semibold text-charcoal mb-3">Rewards</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-start gap-3 p-3 bg-off-white rounded-lg">
            <Gift size={20} className="text-forest-green mt-0.5" />
            <div>
              <p className="font-medium text-charcoal">You get 100 points</p>
              <p className="text-sm text-medium-gray">When your friend makes their first purchase</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-off-white rounded-lg">
            <ShoppingBag size={20} className="text-forest-green mt-0.5" />
            <div>
              <p className="font-medium text-charcoal">They get 50 points</p>
              <p className="text-sm text-medium-gray">Welcome bonus on first purchase</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Stats */}
      {isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : data?.stats && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <div className="text-center">
              <p className="text-2xl font-semibold text-charcoal">{data.stats.total}</p>
              <p className="text-xs text-medium-gray">Total Referrals</p>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <p className="text-2xl font-semibold text-charcoal">{data.stats.converted}</p>
              <p className="text-xs text-medium-gray">Converted</p>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <p className="text-2xl font-semibold text-forest-green">{data.stats.totalRewardsEarned}</p>
              <p className="text-xs text-medium-gray">Points Earned</p>
            </div>
          </Card>
        </div>
      )}

      {/* Referral list */}
      <Card>
        <h3 className="text-base font-semibold text-charcoal mb-4">Your Referrals</h3>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !data?.referrals?.length ? (
          <div className="text-center py-8">
            <Users size={40} className="mx-auto text-light-gray mb-3" />
            <p className="text-medium-gray">No referrals yet. Share your code to get started!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.referrals.map((ref: any) => (
              <div key={ref.id} className="flex items-center justify-between py-2 border-b border-light-gray last:border-0">
                <div>
                  <p className="font-medium text-charcoal">
                    {ref.referee?.firstName} {ref.referee?.lastName}
                  </p>
                  <p className="text-xs text-medium-gray">Joined {formatDate(ref.createdAt)}</p>
                </div>
                <div className="flex items-center gap-3">
                  {ref.referrerReward > 0 && (
                    <span className="text-sm font-medium text-success">+{ref.referrerReward} pts</span>
                  )}
                  <Badge variant={statusVariant[ref.status] || "default"}>
                    {statusLabel[ref.status] || ref.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
