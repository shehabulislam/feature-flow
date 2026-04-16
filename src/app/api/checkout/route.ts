import { freemius } from '@/lib/freemius';
import { processPurchaseInfo, processRedirect } from '@/lib/user-entitlement';

const processor = freemius.checkout.request.createProcessor({
    onPurchase: processPurchaseInfo,
    proxyUrl: process.env.NEXT_PUBLIC_APP_URL!,
    onRedirect: processRedirect,
});

export { processor as GET, processor as POST };