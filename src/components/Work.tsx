"use client";
import React, { useState } from "react";
import { Invoices } from "./Invoices";
import { Estimates } from "./Estimates";
import { Clients } from "./Clients";
import { Services } from "./Services";
import { Invoice, Client, Business, Estimate } from "@/app/page";

interface WorkProps {
    invoices: Invoice[];
    allInvoices?: Invoice[];
    estimates: Estimate[];
    clients: Client[];
    services: any[];
    taxes?: any[];
    termsTemplates?: any[];
    businesses: Business[];
    activeBusinessId: string;
    userId: string;
    initiallyOpenModal?: string | boolean;
    onModalClose: () => void;
    onNavigate?: (view: any, modal?: string) => void;
}

export function Work(props: WorkProps) {
    const [activeTab, setActiveTab] = useState<"invoices" | "estimates" | "clients" | "services">("invoices");

    // If initiallyOpenModal starts with 'edit-estimate' or 'create-estimate', switch to estimates tab
    React.useEffect(() => {
        if (typeof props.initiallyOpenModal === 'string') {
            if (props.initiallyOpenModal.includes('estimate')) {
                setActiveTab("estimates");
            } else if (props.initiallyOpenModal.includes('invoice')) {
                setActiveTab("invoices");
            } else if (props.initiallyOpenModal.includes('client')) {
                setActiveTab("clients");
            } else if (props.initiallyOpenModal.includes('service')) {
                setActiveTab("services");
            }
        }
    }, [props.initiallyOpenModal]);

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-4 bg-white p-2 rounded-2xl border border-gray-100 w-fit shadow-sm">
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
                <button
                    onClick={() => setActiveTab("clients")}
                    className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "clients" ? "bg-gray-900 text-white shadow-lg" : "text-gray-400 hover:text-gray-900 hover:bg-gray-50"} `}
                >
                    Clients
                </button>
                <button
                    onClick={() => setActiveTab("services")}
                    className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "services" ? "bg-gray-900 text-white shadow-lg" : "text-gray-400 hover:text-gray-900 hover:bg-gray-50"} `}
                >
                    Services
                </button>
            </div>

            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {activeTab === "invoices" && <Invoices {...props} />}
                {activeTab === "estimates" && <Estimates {...props} />}
                {activeTab === "clients" && (
                    <Clients
                        {...props}
                        initiallyOpenModal={props.initiallyOpenModal === "create-client"}
                    />
                )}
                {activeTab === "services" && (
                    <Services
                        services={props.services}
                        userId={props.userId}
                        activeBusinessId={props.activeBusinessId}
                    />
                )}
            </div>
        </div>
    );
}
