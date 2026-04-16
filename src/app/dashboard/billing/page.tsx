import { auth } from "@/lib/auth";
import { freemius } from "@/lib/freemius";
import { redirect } from "next/navigation";
import AppCheckoutProvider from "@/components/app-checkout-provider";
import { getUserEntitlement } from "@/lib/user-entitlement";
import { isSuperAdmin } from "@/lib/superadmin";
import BillingClient from "./BillingClient";

export default async function BillingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const checkout = await freemius.checkout.create({
    user: {
      email: session.user.email ?? "",
      name: session.user.name ?? undefined,
    },
    isSandbox: process.env.NODE_ENV !== "production",
  });

  const entitlement = await getUserEntitlement(session.user.id);
  const isSuper = isSuperAdmin(session.user.email);

  return (
    <AppCheckoutProvider checkout={checkout.serialize()}>
      <BillingClient
        hasActiveSubscription={!!entitlement}
        isSuper={isSuper}
        portalEndpoint={process.env.NEXT_PUBLIC_APP_URL! + "/api/portal"}
      />
    </AppCheckoutProvider>
  );
}
