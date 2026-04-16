import { freemius } from "@/lib/freemius";
import { processPurchaseInfo } from "@/lib/user-entitlement";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// Freemius checkout processor — handles both GET (checkout page data)
// and POST (purchase completion callback)
const processor = freemius.checkout.request.createProcessor({
  onPurchase: processPurchaseInfo,
});

export { processor as GET, processor as POST };
