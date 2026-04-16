import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { freemius } from '@/lib/freemius';
import AppCheckoutProvider from '@/components/app-checkout-provider';
import { Subscribe } from '@/react-starter/components/subscribe';

export default async function PurchasePage() {
    const session = await auth();

    if (!session) {
        redirect('/login');
    }

    const checkout = await freemius.checkout.create({
        user: {
            email: session.user?.email ?? '',
            name: session.user?.name ?? undefined,
        },
        isSandbox: process.env.NODE_ENV !== 'production',
    });

    return (
        <AppCheckoutProvider checkout={checkout.serialize()}>
            <Subscribe />
        </AppCheckoutProvider>
    );
}