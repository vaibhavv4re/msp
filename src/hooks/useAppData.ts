import { db } from "@/lib/db";
import { useMemo } from "react";
import { id } from "@instantdb/react";
import {
    Client,
    Invoice,
    Estimate,
    Business,
    BankAccount,
    Service,
    Tax,
    TermsTemplate,
    Expense,
    TDSEntry
} from "@/types";

export function useAppData() {
    const { isLoading: authLoading, user, error: authError } = db.useAuth();

    const query = user ? {
        $users: {
            $: { where: { id: user.id } },
            clients: { invoices: { attachment: {} }, business: {} },
            invoices: { lineItems: {}, client: {}, business: {}, attachment: {}, bankAccount: {} },
            estimates: { lineItems: {}, client: {}, business: {}, convertedInvoice: {} },
            calendarEvents: { business: {} },
            services: { business: {} },
            taxes: { business: {} },
            termsTemplates: { business: {} },
            businesses: {
                bankAccounts: {},
                estimates: { lineItems: {}, client: {}, business: {} }
            },
            bankAccounts: {},
            expenses: { attachment: {}, business: {} },
            tdsEntries: {
                business: {},
                client: {}
            },
            lineItems: { estimate: { $: { fields: ["id"] } } }
        },
        businesses: {
            $: {
                where: {
                    email: user.email,
                    status: "pending_claim"
                }
            },
            clients: { invoices: { lineItems: {} } },
            invoices: { lineItems: {} },
            estimates: { lineItems: {} },
            services: {},
            bankAccounts: {},
            expenses: { attachment: {} },
            taxes: {},
            termsTemplates: {}
        }
    } : null;

    const { isLoading: dataLoading, error, data } = db.useQuery(query as any);

    const memoizedData = useMemo(() => {
        if (!data) return null;

        const currentUser = (data as any)?.$users?.[0] as any;
        const clients = currentUser?.clients || [] as Client[];
        const invoices = currentUser?.invoices || [] as Invoice[];
        const userEstimates = currentUser?.estimates || [] as Estimate[];
        const businessEstimates = currentUser?.businesses?.flatMap((b: any) => b.estimates || []) || [] as Estimate[];
        const conciergeEstimates = (data as any)?.businesses?.flatMap((b: any) => b.estimates || []) || [] as Estimate[];

        // Deduplicate estimates by ID
        const allEstimatesMap = new Map();
        [...userEstimates, ...businessEstimates, ...conciergeEstimates].forEach(est => {
            if (est) allEstimatesMap.set(est.id, est);
        });
        const estimates = Array.from(allEstimatesMap.values());

        const calendarEvents = currentUser?.calendarEvents || [];
        const services = currentUser?.services || [];
        const taxes = currentUser?.taxes || [];
        const termsTemplates = currentUser?.termsTemplates || [];
        const businesses = currentUser?.businesses || [];
        const bankAccounts = currentUser?.bankAccounts || [];
        const expenses = currentUser?.expenses || [];
        const tdsEntries = currentUser?.tdsEntries || [];

        return {
            currentUser,
            clients,
            invoices,
            estimates,
            calendarEvents,
            services,
            taxes,
            termsTemplates,
            businesses,
            bankAccounts,
            expenses,
            tdsEntries,
            user,
        };
    }, [data, user]);

    return {
        isLoading: authLoading || dataLoading,
        error: authError || error,
        data: memoizedData,
        user,
    };
}
