"use client";
import { useAppData } from "@/hooks/useAppData";
import { BusinessForm } from "@/components/forms/BusinessForm";
import { MobilePageLayout } from "@/components/layout/FormLayout";
import { useIsMobile } from "@/lib/device";
import { useRouter } from "next/navigation";

export default function ProfileSetupPage() {
    const { isLoading, data, user } = useAppData();
    const isMobile = useIsMobile();
    const router = useRouter();

    if (isLoading || !data) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
        );
    }

    const handleClose = () => {
        router.back();
    };

    const form = (
        <BusinessForm
            userId={user!.id}
            onClose={handleClose}
            isMobile={isMobile}
        />
    );

    if (isMobile) {
        return (
            <MobilePageLayout
                title="Business Profile"
                subtitle="Entity configuration"
                onClose={handleClose}
            >
                {form}
            </MobilePageLayout>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-12">
            <div className="max-w-3xl mx-auto bg-white rounded-[3rem] shadow-2xl border border-gray-100 overflow-hidden ring-1 ring-gray-200/50">
                <div className="p-12 border-b flex justify-between items-start bg-gray-50/50">
                    <div>
                        <h1 className="text-4xl font-[1000] text-gray-900 uppercase tracking-tight">Setup Profile</h1>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">Configuring your business identity</p>
                    </div>
                </div>
                <div className="p-12">
                    {form}
                </div>
            </div>
        </div>
    );
}
