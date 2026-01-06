"use client";
import React, { useState } from "react";
import { Invoices } from "./Invoices";
import { Estimates } from "./Estimates";
import { Invoice, Client, Business, Estimate } from "@/app/page";

interface SalesProps {
    invoices: Invoice[];
    allInvoices?: Invoice[];
    estimates: Estimate[];
    clients: Client[];
    services?: any[];
    taxes?: any[];
    termsTemplates?: any[];
    businesses: Business[];
    activeBusinessId: string;
    userId: string;
    initiallyOpenModal?: string | boolean;
    onModalClose: () => void;
}

export function Sales(props: SalesProps) {
    const [activeTab, setActiveTab] = useState<"invoices" | "estimates">("invoices");

    // If initiallyOpenModal starts with 'edit-estimate' or 'create-estimate', switch to estimates tab
    React.useEffect(() => {
        if (typeof props.initiallyOpenModal === 'string') {
            if (props.initiallyOpenModal.includes('estimate')) {
                setActiveTab("estimates");
            } else if (props.initiallyOpenModal.includes('invoice')) {
                setActiveTab("invoices");
            }
        }
    }, [props.initiallyOpenModal]);

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4 bg-white p-2 rounded-2xl border border-gray-100 w-fit shadow-sm">
                <button
                    onClick={() => setActiveTab("invoices")}
                    className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "invoices" ? "bg-gray-900 text-white shadow-lg" : "text-gray-400 hover:text-gray-900 hover:bg-gray-50"} `}
                >
                    Invoices
                </button>
                <button
                    onClick={() => setActiveTab("estimates")}
                    className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "estimates" ? "bg-gray-900 text-white shadow-lg" : "text-gray-400 hover:text-gray-900 hover:bg-gray-50"} `}
                >
                    Estimates
                </button>
            </div>

            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {activeTab === "invoices" ? (
                    <Invoices {...props} />
                ) : (
                    <Estimates {...props} />
                )}
            </div>
        </div>
    );
}
