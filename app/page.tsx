/* FILE: app/page.tsx */
export const dynamic = "force-dynamic"; // Keep if data fetching needs to be dynamic per request

import HomeClient from "./HomeClient"; // Ensure this path is correct

export default function Page() {
    return (
        <>
            {/* The main home content, now including former 'Pro' features */}
            <HomeClient />

            {/* Footer links with bottom spacing - Manage Subscription removed */}
            <footer className="mt-8 mb-8 flex flex-wrap justify-center items-center gap-x-6 gap-y-2 px-4 text-sm text-gray-600">
                <a href="/privacy-policy" className="underline hover:text-gray-900">
                    Privacy Policy
                </a>
                <a href="/terms-of-service" className="underline hover:text-gray-900">
                    Terms of Service
                </a>
                {/* Link to Stripe customer portal removed */}
            </footer>
        </>
    );
}