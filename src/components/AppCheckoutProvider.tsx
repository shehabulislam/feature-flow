"use client";

import React, { useCallback } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

// NOTE: The Freemius React Starter Kit must be installed for the CheckoutProvider
// to be available. Install it by running:
//   npx shadcn@latest add https://shadcn.freemius.com/all.json
//
// Once installed, replace the FallbackProvider below with:
//   import { CheckoutProvider } from "@/react-starter/components/checkout-provider";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let CheckoutProvider: React.ComponentType<any> | null = null;
try {
  // Dynamic import will work once the react-starter kit is installed
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  CheckoutProvider =
    require("@/react-starter/components/checkout-provider").CheckoutProvider;
} catch {
  // Not installed yet — will use fallback
}

interface AppCheckoutProviderProps {
  checkout: unknown;
  children: React.ReactNode;
}

/**
 * Wraps the Freemius CheckoutProvider with app-wide defaults.
 * After a purchase syncs, refreshes the page and shows a toast.
 * Falls back to rendering children directly if the React Starter Kit
 * is not yet installed.
 */
export default function AppCheckoutProvider({
  checkout,
  children,
}: AppCheckoutProviderProps) {
  const router = useRouter();

  const onAfterSync = useCallback(() => {
    toast.success("Successfully updated your subscription!");
    router.refresh();
  }, [router]);

  if (!CheckoutProvider) {
    // Fallback: just render children without checkout context
    return <>{children}</>;
  }

  return (
    <CheckoutProvider
      onAfterSync={onAfterSync}
      checkout={checkout}
      endpoint={process.env.NEXT_PUBLIC_APP_URL! + "/api/billing"}
    >
      {children}
    </CheckoutProvider>
  );
}
