"use client";
import React, { useState, useEffect } from "react";
import { Invoices } from "./Invoices";
import { Estimates } from "./Estimates";
import { Clients } from "./Clients";
import { Services } from "./Services";
import { useIsMobile } from "@/lib/device";
import { Invoice, Client, Business, Estimate, Service, Tax, TermsTemplate } from "@/types";

interface WorkProps {
    invoices: Invoice[];
    estimates: Estimate[];
    clients: Client[];
    services: Service[];
    taxes: Tax[];
    termsTemplates: TermsTemplate[];
    businesses: Business[];
    activeBusinessId: string;
    userId: string;
    initiallyOpenModal?: string | boolean;
    onModalClose: () => void;
    onNavigate?: (view: any, modal?: string) => void;
}

export function Work(props: WorkProps) {
    const isMobile = useIsMobile();
    const [activeTab, setActiveTab] = useState<"invoices" | "estimates" | "clients" | "services">("invoices");

    // Persistent tab selection
    useEffect(() => {
        const saved = localStorage.getItem("work_active_tab");
        if (saved && ["invoices", "estimates", "clients", "services"].includes(saved)) {
            setActiveTab(saved as any);
        }
    }, []);

    const handleTabChange = (tab: any) => {
        setActiveTab(tab);
        localStorage.setItem("work_active_tab", tab);
    };

    // Modal navigation handling
    useEffect(() => {
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
            {/* Sticky Tab Bar */}
            <div className={`sticky top-0 z-40 -mx-6 px-6 py-4 bg-gray-50/80 backdrop-blur-md border-b border-gray-100 mb-2 overflow-x-auto no-scrollbar`}>
                <div className="flex items-center gap-2 min-w-max mx-auto md:mx-0">
                    {[
                        { id: "invoices", label: "Invoices" },
                        { id: "estimates", label: "Estimates" },
                        { id: "clients", label: "Clients" },
                        { id: "services", label: "Services" }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => handleTabChange(tab.id as any)}
                            className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? "bg-gray-900 text-white shadow-xl shadow-gray-200" : "text-gray-400 hover:text-gray-900 hover:bg-white"} `}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
                {activeTab === "invoices" && <Invoices {...props} isMobile={isMobile} />}
                {activeTab === "estimates" && <Estimates {...props} isMobile={isMobile} />}
                {activeTab === "clients" && (
                    <Clients
                        {...props}
                        isMobile={isMobile}
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
