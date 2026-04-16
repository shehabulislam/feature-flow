import { freemius } from "@/lib/freemius";
import { getFsUser, processPurchaseInfo } from "@/lib/user-entitlement";

// Customer Portal API — allows users to manage their subscription,
// view invoices, and update payment methods via Freemius.
const processor = freemius.customerPortal.request.createProcessor({
  getUser: getFsUser,
  portalEndpoint: process.env.NEXT_PUBLIC_APP_URL! + "/api/portal",
  isSandbox: process.env.NODE_ENV !== "production",
  onRestore: freemius.customerPortal.createRestorer(processPurchaseInfo),
});

export { processor as GET, processor as POST };
