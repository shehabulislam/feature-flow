import { freemius } from "@/lib/freemius";
import prisma from "@/lib/prisma";
import { processPurchaseInfo } from "@/lib/user-entitlement";

/**
 * Sync a single entitlement from Freemius into our database.
 */
async function syncEntitlementFromWebhook(fsLicenseId: string) {
  const purchaseInfo = await freemius.purchase.retrievePurchase(fsLicenseId);
  if (purchaseInfo) await processPurchaseInfo(purchaseInfo);
}

/**
 * Remove an entitlement record when its license is deleted on Freemius.
 */
async function deleteEntitlement(fsLicenseId: string) {
  await prisma.userFsEntitlement
    .delete({ where: { fsLicenseId } })
    .catch(() => {
      // Record may not exist locally — safe to ignore
    });
}

// Set up Freemius webhook listener
const listener = freemius.webhook.createListener();

listener.on(
  [
    "license.created",
    "license.extended",
    "license.shortened",
    "license.updated",
    "license.cancelled",
    "license.expired",
    "license.plan.changed",
  ],
  async ({ objects: { license } }) => {
    if (license?.id) await syncEntitlementFromWebhook(license.id);
  }
);

listener.on("license.deleted", async ({ data }) => {
  if (data?.license_id) await deleteEntitlement(data.license_id);
});

const processor = freemius.webhook.createRequestProcessor(listener);

export { processor as POST };
