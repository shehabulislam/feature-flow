"use client";

import { CreditCard, Crown, ShieldCheck, Sparkles } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { CustomerPortal } from "@/react-starter/components/customer-portal";
import { Subscribe } from "@/react-starter/components/subscribe";

interface BillingClientProps {
  hasActiveSubscription: boolean;
  isSuper: boolean;
  portalEndpoint: string;
}

export default function BillingClient({
  hasActiveSubscription,
  isSuper,
  portalEndpoint,
}: BillingClientProps) {
  if (isSuper) {
    return (
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Billing & Plans</h1>
            <p className="text-muted-foreground mt-1">
              Super admins have unlimited access.
            </p>
          </div>
          <ThemeToggle />
        </div>
        <div className="p-6 rounded-2xl border border-border bg-surface text-center">
          <Crown className="w-10 h-10 text-primary mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Super Admin Access</h2>
          <p className="text-muted-foreground">
            You do not need to upgrade or manage billing plans.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Billing & Plans</h1>
          <p className="text-muted-foreground mt-1">
            Manage your subscription and billing
          </p>
        </div>
        <ThemeToggle />
      </div>

      {/* Current Status */}
      <div className="p-6 rounded-2xl border border-border bg-surface">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              hasActiveSubscription
                ? "bg-gradient-to-br from-emerald-500 to-green-600"
                : "bg-gradient-to-br from-slate-500 to-slate-600"
            }`}
          >
            {hasActiveSubscription ? (
              <ShieldCheck className="w-5 h-5 text-white" />
            ) : (
              <Sparkles className="w-5 h-5 text-white" />
            )}
          </div>
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              {hasActiveSubscription ? "Active Subscription" : "Free Plan"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {hasActiveSubscription
                ? "Your subscription is active. Manage it below."
                : "Upgrade to unlock more features and higher limits."}
            </p>
          </div>
        </div>
      </div>

      {/* Freemius Pricing / Portal Section */}
      <div className="rounded-2xl border border-border bg-surface overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-bold">
            {hasActiveSubscription ? "Manage Subscription" : "Choose a Plan"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {hasActiveSubscription
              ? "View invoices, update payment method, or change your plan."
              : "Select a plan below to get started."}
          </p>
        </div>

        <div className="p-6">
          {hasActiveSubscription ? (
            <CustomerPortal endpoint={portalEndpoint} />
          ) : (
            <Subscribe />
          )}
        </div>
      </div>
    </div>
  );
}
