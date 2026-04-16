# Skill: Integrating Freemius SaaS SDK with Next.js

This guide serves as a skill set for building a SaaS application using Next.js and the Freemius JS/TS SDK, along with the React Starter Kit.

## 1. Prerequisites & Installation

### Core Dependencies
Ensure the following packages are installed:
```bash
npm install @freemius/sdk @freemius/checkout zod
```

### Install React Starter Kit (shadcn/ui based)
Run the following to add all Freeemius provided UI components to the project:
```bash
npx shadcn@latest add https://shadcn.freemius.com/all.json
```

## 2. Environment & Database Setup

### Environment Variables
Set the necessary variables in `.env`:
```env
FREEMIUS_PRODUCT_ID=your_product_id
FREEMIUS_API_KEY=your_api_key
FREEMIUS_SECRET_KEY=your_secret_key
FREEMIUS_PUBLIC_KEY=your_public_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Prisma Schema
Create a model to link your users to their Freemius licenses. Make sure you have a `User` model set up (e.g. via NextAuth or Better Auth).

```prisma
model UserFsEntitlement {
  id          String   @id @default(cuid())
  userId      String
  User        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  fsLicenseId String   @unique
  fsPlanId    String
  fsPricingId String
  fsUserId    String
  type        String   // Usually mapped to an enum or defined as 'subscription' / 'one-time'
  expiration  DateTime?
  isCanceled  Boolean
  createdAt   DateTime

  // Index optimized for type filtering
  @@index([type])
  @@map("user_fs_entitlement")
}
```

## 3. Core Freemius Configuration

### Create the SDK Instance
Create a file like `src/lib/freemius.ts`:
```typescript
import { Freemius } from '@freemius/sdk';

export const freemius = new Freemius({
  productId: process.env.FREEMIUS_PRODUCT_ID!,
  apiKey: process.env.FREEMIUS_API_KEY!,
  secretKey: process.env.FREEMIUS_SECRET_KEY!,
  publicKey: process.env.FREEMIUS_PUBLIC_KEY!,
});
```

### Entitlement Helper Functions
Create `src/lib/user-entitlement.ts` to manage purchases and validate access:
```typescript
import { PurchaseInfo, UserRetriever } from '@freemius/sdk';
import { freemius } from './freemius';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

// 1. Process purchase & upsert DB record
export async function processPurchaseInfo(fsPurchase: PurchaseInfo): Promise<void> {
  const user = await getUserByEmail(fsPurchase.email); // Define this helper
  if (!user) return;
  
  await prisma.userFsEntitlement.upsert({
    where: { fsLicenseId: fsPurchase.licenseId },
    update: fsPurchase.toEntitlementRecord(),
    create: fsPurchase.toEntitlementRecord({ userId: user.id }),
  });
}

// 2. Retrieve & validate entitlement
export async function getUserEntitlement(userId: string) {
  const entitlements = await prisma.userFsEntitlement.findMany({
    where: { userId, type: 'subscription' },
  });
  return freemius.entitlement.getActive(entitlements);
}

// 3. Authenticate fsUser
export const getFsUser: UserRetriever = async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  const entitlement = session ? await getUserEntitlement(session.user.id) : null;
  const email = session?.user.email ?? undefined;
  return freemius.entitlement.getFsUser(entitlement, email);
};
```

## 4. Checkout & Paywalls

### Checkout API Endpoint (`app/api/checkout/route.ts`)
```typescript
import { freemius } from '@/lib/freemius';
import { processPurchaseInfo } from '@/lib/user-entitlement';

const processor = freemius.checkout.request.createProcessor({
  onPurchase: processPurchaseInfo,
});

export { processor as GET, processor as POST };
```

### App Checkout Provider Wrapper
Create a client component wrapper `src/components/AppCheckoutProvider.tsx`:
```tsx
'use client';
import { CheckoutProvider } from '@/react-starter/components/checkout-provider';
import { type CheckoutSerialized } from '@freemius/sdk';
import React, { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function AppCheckoutProvider({ checkout, children }: { checkout: CheckoutSerialized; children: React.ReactNode }) {
  const router = useRouter();

  const onAfterSync = useCallback(() => {
    toast.success("Successfully updated your subscription!");
    router.refresh();
  }, [router]);

  return (
    <CheckoutProvider 
      onAfterSync={onAfterSync} 
      checkout={checkout} 
      endpoint={process.env.NEXT_PUBLIC_APP_URL! + '/api/checkout'}
    >
      {children}
    </CheckoutProvider>
  );
}
```

### Pricing Table implementation
In a server component (e.g., `app/purchase/page.tsx`):
```tsx
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { freemius } from '@/lib/freemius';
import AppCheckoutProvider from '@/components/AppCheckoutProvider';
// 'Subscribe' for Subscriptions, 'Topup' for One-Off purchases
import { Subscribe } from '@/react-starter/components/subscribe'; 

export default async function PurchasePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');

  const checkout = await freemius.checkout.create({
    user: session?.user,
    isSandbox: process.env.NODE_ENV !== 'production',
  });

  return (
    <AppCheckoutProvider checkout={checkout.serialize()}>
      <Subscribe /> 
    </AppCheckoutProvider>
  );
}
```

### Using Paywalls
Client Component Example:
```tsx
'use client';
import { Button } from '@/components/ui/button';
import { Paywall, usePaywall } from '@/react-starter/components/paywall';

export default function PaywallDemo() {
  const { state, showNoActivePurchase, showInsufficientCredits, hidePaywall } = usePaywall();
  
  return (
    <>
      <Paywall state={state} hidePaywall={hidePaywall} />
      <Button onClick={showNoActivePurchase}>Trigger Sub Paywall</Button>
    </>
  );
}
```
*Note: Any component using hooks like `usePaywall` must be a descendant of `<CheckoutProvider>`.*

## 5. Customer Portal

### Portal API Endpoint (`app/api/portal/route.ts`)
```typescript
import { freemius } from '@/lib/freemius';
import { getFsUser, processPurchaseInfo } from '@/lib/user-entitlement';

const processor = freemius.customerPortal.request.createProcessor({
  getUser: getFsUser,
  portalEndpoint: process.env.NEXT_PUBLIC_APP_URL! + '/api/portal',
  isSandbox: process.env.NODE_ENV !== 'production',
  onRestore: freemius.customerPortal.createRestorer(processPurchaseInfo),
});

export { processor as GET, processor as POST };
```

### Portal Frontend (`app/billing/page.tsx`)
```tsx
import { auth } from '@/lib/auth';
import { freemius } from '@/lib/freemius';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { CustomerPortal } from '@/react-starter/components/customer-portal';
import AppCheckoutProvider from '@/components/AppCheckoutProvider';

export default async function Billing() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');

  const checkout = await freemius.checkout.create({
    user: session?.user,
    isSandbox: process.env.NODE_ENV !== 'production',
  });

  return (
    <AppCheckoutProvider checkout={checkout.serialize()}>
      <CustomerPortal endpoint={process.env.NEXT_PUBLIC_APP_URL! + '/api/portal'} />
    </AppCheckoutProvider>
  );
}
```

## 6. Webhooks

### Webhook API Endpoint (`app/api/webhook/route.ts`)
Creates a processor that listens to Freemius events and syncs entitlement data locally.

```typescript
import { freemius } from '@/lib/freemius';
import { prisma } from '@/lib/prisma';
import { processPurchaseInfo } from '@/lib/user-entitlement';

// First, make sure you have these helpers in user-entitlement.ts (or defined here):
async function syncEntitlementFromWebhook(fsLicenseId: string) {
  const purchaseInfo = await freemius.purchase.retrievePurchase(fsLicenseId);
  if (purchaseInfo) await processPurchaseInfo(purchaseInfo);
}

async function deleteEntitlement(fsLicenseId: string) {
  await prisma.userFsEntitlement.delete({ where: { fsLicenseId } });
}

// Set up webhook listener
const listener = freemius.webhook.createListener();

listener.on(
  [
    'license.created', 'license.extended', 'license.shortened', 
    'license.updated', 'license.cancelled', 'license.expired', 'license.plan.changed'
  ],
  async ({ objects: { license } }) => {
    if (license?.id) await syncEntitlementFromWebhook(license.id);
  }
);

listener.on('license.deleted', async ({ data }) => {
  if (data?.license_id) await deleteEntitlement(data.license_id);
});

const processor = freemius.webhook.createRequestProcessor(listener);

export { processor as POST };
```

*(You must register `https://your-app.com/api/webhook` in the Freemius dashboard and subscribe to the selected events).*
