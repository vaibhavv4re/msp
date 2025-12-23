// Docs: https://www.instantdb.com/docs/modeling-data

import { i } from "@instantdb/react";

const _schema = i.schema({
  entities: {
    $files: i.entity({
      path: i.string().unique().indexed(),
      url: i.string(),
    }),
    $users: i.entity({
      email: i.string().unique().indexed().optional(),
      imageURL: i.string().optional(),
      type: i.string().optional(),
      calendarSecret: i.string().optional(), // Secret key for iCal feed
    }),
    calendarEvents: i.entity({
      title: i.string().optional(),
      start: i.string(), // ISO string
      end: i.string(),   // ISO string
      status: i.string(), // "tentative" | "confirmed" | "cancelled"
      icalUid: i.string(), // Stable UID for iCal
      googleEventId: i.string().optional(),
      // Keep legacy fields for migration support if needed
      date: i.string().optional(),
      duration: i.string().optional(),
      callTime: i.string().optional(),
      syncToGoogle: i.boolean().optional(),
    }),
    clients: i.entity({
      customerType: i.string().optional(), // Business or Individual
      salutation: i.string().optional(),
      firstName: i.string().optional(),
      lastName: i.string().optional(),
      companyName: i.string().optional(),
      displayName: i.string().optional(),
      email: i.string().optional(),
      phone: i.string().optional(),
      workPhone: i.string().optional(),
      mobile: i.string().optional(),
      address: i.string().optional(),
      pan: i.string().optional(),
      tan: i.string().optional(),
      gst: i.string().optional(),
      currency: i.string().optional(),
      paymentTerms: i.string().optional(), // Due on receipt, net 15, net 30, net 45, net 60, custom
      customTermDays: i.number().optional(),
    }),
    businesses: i.entity({
      name: i.string(),
      address: i.string().optional(),
      contact: i.string().optional(),
      email: i.string().optional(),
      pan: i.string().optional(),
      gst: i.string().optional(),
      color: i.string().optional(), // HEX color for business
    }),
    invoices: i.entity({
      invoiceNumber: i.string(),
      invoiceDate: i.string(),
      orderNumber: i.string().optional(),
      paymentTerms: i.string().optional(),
      dueDate: i.string(),
      subject: i.string().optional(),
      status: i.string(),
      subtotal: i.number(),
      cgst: i.number().optional(),
      sgst: i.number().optional(),
      igst: i.number().optional(),
      total: i.number(),
      notes: i.string().optional(),
      termsAndConditions: i.string().optional(),
      usageType: i.string().optional(),
      usageOther: i.string().optional(),
      usageDuration: i.string().optional(),
      usageGeography: i.string().optional(),
      usageExclusivity: i.string().optional(),
      advanceAmount: i.number().optional(),
      isAdvanceReceived: i.boolean().optional(),
      sentAt: i.string().optional(), // ISO timestamp when marked as sent
    }),
    lineItems: i.entity({
      itemType: i.string().optional(), // 'service' or 'custom'
      description: i.string(),
      sacCode: i.string().optional(),
      quantity: i.number(),
      rate: i.number(),
      amount: i.number(),
    }),
    services: i.entity({
      name: i.string(),
      description: i.string().optional(),
      sacCode: i.string().optional(),
      rate: i.number(),
      isActive: i.boolean(),
    }),
    taxes: i.entity({
      name: i.string(),
      taxType: i.string(), // CGST, SGST, IGST, GST, etc
      rate: i.number(),
      isDefault: i.boolean(),
    }),
    termsTemplates: i.entity({
      title: i.string(),
      content: i.string(),
      isDefault: i.boolean(),
    }),
    taxSettings: i.entity({
      cgstRate: i.number(),
      igstRate: i.number(),
      isDefault: i.boolean(),
      sgstRate: i.number(),
    }),
    expenses: i.entity({
      description: i.string().optional(),
      amount: i.number(),
      date: i.string(), // ISO string
      category: i.string(), // Travel, Assistants, Studio/Rent, Equipment/Rentals, Miscellaneous
      notes: i.string().optional(),
      vendorName: i.string().optional(),
      gstCharged: i.boolean().optional(),
      gstAmount: i.number().optional(),
      vendorGSTIN: i.string().optional(),
      itcReview: i.string().optional(), // "yes" | "no" | "unsure"
      displayId: i.string().optional(), // e.g. EXP-0001
      displayNumber: i.number().optional(), // Sequential number
      ocrStatus: i.string().optional(), // "pending" | "processing" | "done" | "failed"
      ocrSuggestions: i.any().optional(), // Stores suggested amount, date, vendor, etc.
      status: i.string().optional(), // "draft" | "confirmed"
    }),
    tdsEntries: i.entity({
      amount: i.number(),
      fy: i.string(), // Financial Year
      hasCertificate: i.boolean(),
      notes: i.string().optional(),
    }),
    attachments: i.entity({
      publicId: i.string().unique().indexed(),
      url: i.string(),
      type: i.string(), // "expense_bill" | "invoice_pdf" | "ca_export"
      createdAt: i.string(), // ISO string
    }),
  },
  links: {
    $usersLinkedPrimaryUser: {
      forward: {
        on: "$users",
        has: "one",
        label: "linkedPrimaryUser",
        onDelete: "cascade",
      },
      reverse: {
        on: "$users",
        has: "many",
        label: "linkedGuestUsers",
      },
    },
    // User ownership links for data isolation
    calendarEventsOwner: {
      forward: {
        on: "calendarEvents",
        has: "one",
        label: "owner",
      },
      reverse: {
        on: "$users",
        has: "many",
        label: "calendarEvents",
      },
    },
    clientsOwner: {
      forward: {
        on: "clients",
        has: "one",
        label: "owner",
      },
      reverse: {
        on: "$users",
        has: "many",
        label: "clients",
      },
    },
    businessesOwner: {
      forward: {
        on: "businesses",
        has: "one",
        label: "owner",
      },
      reverse: {
        on: "$users",
        has: "many",
        label: "businesses",
      },
    },
    invoicesOwner: {
      forward: {
        on: "invoices",
        has: "one",
        label: "owner",
      },
      reverse: {
        on: "$users",
        has: "many",
        label: "invoices",
      },
    },
    servicesOwner: {
      forward: {
        on: "services",
        has: "one",
        label: "owner",
      },
      reverse: {
        on: "$users",
        has: "many",
        label: "services",
      },
    },
    taxesOwner: {
      forward: {
        on: "taxes",
        has: "one",
        label: "owner",
      },
      reverse: {
        on: "$users",
        has: "many",
        label: "taxes",
      },
    },
    termsTemplatesOwner: {
      forward: {
        on: "termsTemplates",
        has: "one",
        label: "owner",
      },
      reverse: {
        on: "$users",
        has: "many",
        label: "termsTemplates",
      },
    },
    invoicesClient: {
      forward: {
        on: "invoices",
        has: "one",
        label: "client",
      },
      reverse: {
        on: "clients",
        has: "many",
        label: "invoices",
      },
    },
    invoicesBusiness: {
      forward: {
        on: "invoices",
        has: "one",
        label: "business",
      },
      reverse: {
        on: "businesses",
        has: "many",
        label: "invoices",
      },
    },
    lineItemsInvoice: {
      forward: {
        on: "lineItems",
        has: "one",
        label: "invoice",
      },
      reverse: {
        on: "invoices",
        has: "many",
        label: "lineItems",
      },
    },
    lineItemsService: {
      forward: {
        on: "lineItems",
        has: "one",
        label: "service",
      },
      reverse: {
        on: "services",
        has: "many",
        label: "lineItems",
      },
    },
    expensesOwner: {
      forward: {
        on: "expenses",
        has: "one",
        label: "owner",
      },
      reverse: {
        on: "$users",
        has: "many",
        label: "expenses",
      },
    },
    tdsEntriesOwner: {
      forward: {
        on: "tdsEntries",
        has: "one",
        label: "owner",
      },
      reverse: {
        on: "$users",
        has: "many",
        label: "tdsEntries",
      },
    },
    tdsEntriesClient: {
      forward: {
        on: "tdsEntries",
        has: "one",
        label: "client",
      },
      reverse: {
        on: "clients",
        has: "many",
        label: "tdsEntries",
      },
    },
    expenseAttachment: {
      forward: {
        on: "expenses",
        has: "one",
        label: "attachment",
      },
      reverse: {
        on: "attachments",
        has: "one",
        label: "expense",
      },
    },
    invoiceAttachment: {
      forward: {
        on: "invoices",
        has: "one",
        label: "attachment",
      },
      reverse: {
        on: "attachments",
        has: "one",
        label: "invoice",
      },
    },
  },
  rooms: {},
});

// This helps Typescript display nicer intellisense
type _AppSchema = typeof _schema;
interface AppSchema extends _AppSchema { }
const schema: AppSchema = _schema;

export type { AppSchema };
export default schema;
