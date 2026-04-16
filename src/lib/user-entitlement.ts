import type { PurchaseInfo, UserRetriever, PurchaseEntitlementData } from "@freemius/sdk";
import { freemius } from "./freemius";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { CheckoutRedirectInfo } from '@freemius/sdk';

/**
 * Look up a local user by their email address.
 */
async function getUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
}

/**
 * Process a Freemius purchase and upsert the local entitlement record.
 * Called from the checkout callback and from webhook handlers.
 */
export async function processPurchaseInfo(
  fsPurchase: PurchaseInfo
): Promise<void> {
  const user = await getUserByEmail(fsPurchase.email);
  if (!user) return;

  await prisma.userFsEntitlement.upsert({
    where: { fsLicenseId: fsPurchase.licenseId },
    update: fsPurchase.toEntitlementRecord(),
    create: fsPurchase.toEntitlementRecord({ userId: user.id }),
  });

  // Map Freemius plan IDs → local plan names
  const planMapping: Record<string, string> = {
    [process.env.FREEMIUS_PRO_PLAN_ID ?? "45808"]: "pro",
    [process.env.FREEMIUS_TEAM_PLAN_ID ?? "45806"]: "team",
  };

  const planName = planMapping[fsPurchase.planId] ?? "pro";
  await prisma.user.update({
    where: { id: user.id },
    data: { plan: planName },
  });
}

/**
 * Retrieve the active entitlement for a user.
 */
export async function getUserEntitlement(userId: string) {
  const entitlements = await prisma.userFsEntitlement.findMany({
    where: { userId, type: "subscription" },
  });
  return freemius.entitlement.getActive(
    entitlements as unknown as PurchaseEntitlementData[]
  );
}

/**
 * UserRetriever function – returns an FsUser for the current session.
 * Used by the customer portal API.
 */
export const getFsUser: UserRetriever = async () => {
  const session = await auth();
  const userId = session?.user?.id;
  const entitlement = userId ? await getUserEntitlement(userId) : null;
  const email = session?.user?.email ?? undefined;
  return freemius.entitlement.getFsUser(entitlement, email);
};




export async function processRedirect(
  info: CheckoutRedirectInfo
): Promise<void> {
  const purchaseInfo = await freemius.purchase.retrievePurchase(
    info.license_id
  );

  if (purchaseInfo) {
    await processPurchaseInfo(purchaseInfo);
  }
}