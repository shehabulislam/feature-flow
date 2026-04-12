"use client";

import { useState, useEffect } from "react";
import { Loader2, CreditCard, Crown, Sparkles, Check, ArrowUpRight } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import toast from "react-hot-toast";
import { PLAN_LIMITS, type PlanType } from "@/lib/plans";
import { useSession } from "next-auth/react";
import { isSuperAdmin } from "@/lib/superadmin";

export default function BillingPage() {
  const { data: session } = useSession();
  const [currentPlan, setCurrentPlan] = useState<PlanType>("free");
  const [loading, setLoading] = useState(true);
  const [billingLoading, setBillingLoading] = useState<string | null>(null);

  // If super admin, billing page should probably not be usable, or just hide pricing.
  const isSuper = isSuperAdmin(session?.user?.email);

  useEffect(() => {
    fetch("/api/billing")
      .then((r) => r.json())
      .then((data) => {
        setCurrentPlan((data.plan || "free") as PlanType);
        setLoading(false);
      })
      .catch(() => {
        setCurrentPlan("free");
        setLoading(false);
      });
  }, []);

  const handleUpgrade = async (plan: string) => {
    setBillingLoading(plan);
    try {
      const res = await fetch("/api/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || "Failed to start checkout");
      }
    } catch {
      toast.error("Failed to start checkout");
    } finally {
      setBillingLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (isSuper) {
    return (
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Billing & Plans</h1>
            <p className="text-muted-foreground mt-1">Super admins have unlimited access.</p>
          </div>
          <ThemeToggle />
        </div>
        <div className="p-6 rounded-2xl border border-border bg-surface text-center">
          <Crown className="w-10 h-10 text-primary mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Super Admin Access</h2>
          <p className="text-muted-foreground">You do not need to upgrade or manage billing plans.</p>
        </div>
      </div>
    );
  }

  const plans = [
    {
      key: "free" as const,
      icon: Sparkles,
      gradient: "from-slate-500 to-slate-600",
      features: ["1 project", "100 feedbacks", "10 roadmap items", "10 changelog entries"],
    },
    {
      key: "pro" as const,
      icon: Crown,
      gradient: "from-primary to-secondary",
      features: ["5 projects", "1,000 feedbacks/project", "100 roadmap items", "100 changelog", "Priority support"],
    },
    {
      key: "team" as const,
      icon: CreditCard,
      gradient: "from-amber-500 to-orange-500",
      features: ["Unlimited projects", "Unlimited feedbacks", "Unlimited roadmap/changelog", "Custom branding", "API access"],
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Billing & Plans</h1>
          <p className="text-muted-foreground mt-1">Manage your active subscription</p>
        </div>
        <ThemeToggle />
      </div>

      <div className="p-6 rounded-2xl border border-border bg-surface">
        <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-primary" />
          Current Plan
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          You are currently on the <span className="font-semibold text-foreground capitalize">{currentPlan}</span> plan.
          {currentPlan === "free" && " Upgrade to unlock custom css, custom domains, and more projects."}
        </p>

        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const limits = PLAN_LIMITS[plan.key];
            const isCurrent = currentPlan === plan.key;
            return (
              <div
                key={plan.key}
                className={`relative p-5 rounded-xl border-2 transition-all ${
                  isCurrent
                    ? "border-primary bg-primary/5 shadow-md flex flex-col justify-between"
                    : "border-border hover:border-primary/30 flex flex-col justify-between"
                }`}
              >
                {isCurrent && (
                  <div className="absolute -top-2.5 left-4 px-2 py-0.5 rounded-full bg-primary text-white text-[10px] font-bold shadow-sm">
                    CURRENT
                  </div>
                )}
                <div>
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${plan.gradient} flex items-center justify-center mb-3 shadow-inner`}>
                    <plan.icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-bold capitalize text-lg">{plan.key}</h3>
                  <p className="text-2xl font-bold mb-4">
                    ${limits.price}<span className="text-sm font-normal text-muted-foreground">/mo</span>
                  </p>
                  <ul className="space-y-2 mb-6">
                    {plan.features.map((f) => (
                      <li key={f} className="text-sm text-muted-foreground flex items-start gap-2">
                        <Check className="w-4 h-4 text-success shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  {!isCurrent && plan.key !== "free" && (
                    <button
                      onClick={() => handleUpgrade(plan.key)}
                      disabled={!!billingLoading}
                      className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-sm font-semibold transition-all flex items-center justify-center gap-1.5 hover:shadow-lg hover:shadow-primary/25 disabled:opacity-60"
                    >
                      {billingLoading === plan.key ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>Upgrade <ArrowUpRight className="w-3.5 h-3.5" /></>
                      )}
                    </button>
                  )}
                  {plan.key === "free" && !isCurrent && (
                    <p className="text-sm text-center text-muted-foreground border border-border py-2.5 rounded-xl">Free tier</p>
                  )}
                  {isCurrent && (
                    <div className="w-full py-2.5 rounded-xl bg-primary/10 text-primary text-sm font-semibold text-center border border-primary/20">
                      Active Plan
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {!process.env.NEXT_PUBLIC_STRIPE_ENABLED && (
          <p className="text-xs text-muted-foreground mt-6 p-3 rounded-lg bg-muted/50">
            💡 To enable payments, set <code className="bg-muted px-1 rounded">STRIPE_SECRET_KEY</code>,{" "}
            <code className="bg-muted px-1 rounded">STRIPE_PRO_PRICE_ID</code>, and{" "}
            <code className="bg-muted px-1 rounded">STRIPE_TEAM_PRICE_ID</code> in your <code className="bg-muted px-1 rounded">.env</code> file.
          </p>
        )}
      </div>
    </div>
  );
}
