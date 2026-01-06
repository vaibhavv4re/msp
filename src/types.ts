import { InstaQLEntity } from "@instantdb/react";
import { AppSchema } from "@/instant.schema";

export type Client = InstaQLEntity<AppSchema, "clients"> & { invoices: Invoice[] };
export type Invoice = InstaQLEntity<AppSchema, "invoices"> & {
    client?: Client;
    lineItems: LineItem[];
    business?: Business;
    bankAccount?: BankAccount;
    attachment?: Attachment;
};
export type LineItem = InstaQLEntity<AppSchema, "lineItems">;
export type CalendarEvent = InstaQLEntity<AppSchema, "calendarEvents">;
export type Estimate = InstaQLEntity<AppSchema, "estimates"> & {
    client?: Client;
    lineItems: LineItem[];
    business?: Business;
    convertedInvoice?: Invoice;
};
export type Business = InstaQLEntity<AppSchema, "businesses"> & { bankAccounts: BankAccount[] };
export type BankAccount = InstaQLEntity<AppSchema, "bankAccounts">;
export type Service = InstaQLEntity<AppSchema, "services">;
export type Tax = InstaQLEntity<AppSchema, "taxes">;
export type TermsTemplate = InstaQLEntity<AppSchema, "termsTemplates">;
export type Expense = InstaQLEntity<AppSchema, "expenses"> & {
    attachment?: Attachment;
    business?: Business;
};
export type Attachment = InstaQLEntity<AppSchema, "attachments">;
export type TDSEntry = InstaQLEntity<AppSchema, "tdsEntries"> & {
    client?: Client;
    business?: Business;
};

export type View = "dashboard" | "work" | "calendar" | "taxzone" | "settings" | "data";
