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
      role: i.string().optional(), // "admin" | "user"
      status: i.string().optional(), // "active" | "disabled"
      lastLoginAt: i.string().optional(), // ISO string
      createdAt: i.string().optional(), // ISO string
    }),
    calendarEvents: i.entity({
      title: i.string().optional(),
      start: i.string().optional(), // ISO string
      end: i.string().optional(),   // ISO string
      status: i.string().optional(), // "tentative" | "confirmed" | "cancelled"
      icalUid: i.string().optional(), // Stable UID for iCal
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
      isTdsDeducting: i.boolean().optional(),
      source: i.string().optional(), // "manual" | "imported" | "concierge"
    }),
    businesses: i.entity({
      name: i.string().optional(), // Brand Name
      legalName: i.string().optional(),
      businessType: i.string().optional(), // Individual, Proprietorship, LLP, Pvt Ltd
      address: i.string().optional(), // Registered Address
      city: i.string().optional(),
      state: i.string().optional(),
      pin: i.string().optional(),
      country: i.string().optional(),
      contact: i.string().optional(), // Business Phone
      email: i.string().optional(), // Business Email
      whatsappNumber: i.string().optional(),
      pan: i.string().optional(),
      gst: i.string().optional(),
      gstType: i.string().optional(), // Regular, Composition, etc.
      stateCode: i.string().optional(),
      isComposition: i.boolean().optional(),
      taxBehavior: i.string().optional(), // inclusive, exclusive
      color: i.string().optional(), // HEX color for business
      signatureUrl: i.string().optional(),
      invoicePrefix: i.string().optional(),
      invoiceSeparator: i.string().optional(),
      invoiceIncludeFY: i.boolean().optional(),
      invoiceFYFormat: i.string().optional(), // "FY25" or "25"
      invoiceStartNumber: i.number().optional(),
      invoicePadding: i.number().optional(),
      invoiceTemplate: i.string().optional(), // "classic" | "compact" | "creative"
      status: i.string().optional(), // "pending_claim" | "active" | "disabled"
      createdBy: i.string().optional(), // "admin" | "self"
      isConfirmed: i.boolean().optional(),
    }),
    bankAccounts: i.entity({
      label: i.string().optional(), // Primary / Secondary
      bankName: i.string().optional(),
      holderName: i.string().optional(),
      accountNumber: i.string().optional(),
      ifsc: i.string().optional(),
      upiId: i.string().optional(),
      chequeName: i.string().optional(),
      isActive: i.boolean().optional(),
      source: i.string().optional(), // "manual" | "imported" | "concierge"
    }),
    invoices: i.entity({
      invoiceNumber: i.string().optional(),
      invoiceDate: i.string().optional(),
      orderNumber: i.string().optional(),
      paymentTerms: i.string().optional(),
      dueDate: i.string().optional(),
      subject: i.string().optional(),
      status: i.string().optional(),
      subtotal: i.number().optional(),
      cgst: i.number().optional(),
      sgst: i.number().optional(),
      igst: i.number().optional(),
      total: i.number().optional(),
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
      tdsDeducted: i.boolean().optional(),
      tdsAmount: i.number().optional(),
      paidAt: i.string().optional(), // ISO timestamp
      lastReminderSentAt: i.string().optional(),
      source: i.string().optional(), // "manual" | "imported" | "concierge"
    }),
    lineItems: i.entity({
      itemType: i.string().optional(), // 'service' or 'custom'
      description: i.string().optional(),
      sacCode: i.string().optional(),
      quantity: i.number().optional(),
      rate: i.number().optional(),
      amount: i.number().optional(),
    }),
    services: i.entity({
      name: i.string().optional(),
      description: i.string().optional(),
      sacCode: i.string().optional(),
      rate: i.number().optional(),
      isActive: i.boolean().optional(),
      source: i.string().optional(), // "manual" | "imported" | "concierge"
    }),
    taxes: i.entity({
      name: i.string().optional(),
      taxType: i.string().optional(), // CGST, SGST, IGST, GST, etc
      rate: i.number().optional(),
      isDefault: i.boolean().optional(),
    }),
    termsTemplates: i.entity({
      title: i.string().optional(),
      content: i.string().optional(),
      isDefault: i.boolean().optional(),
    }),
    taxSettings: i.entity({
      cgstRate: i.number().optional(),
      igstRate: i.number().optional(),
      isDefault: i.boolean().optional(),
      sgstRate: i.number().optional(),
    }),
    expenses: i.entity({
      description: i.string().optional(),
      amount: i.number().optional(),
      date: i.string().optional(), // ISO string
      category: i.string().optional(), // Travel, Assistants, Studio/Rent, Equipment/Rentals, Miscellaneous
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
      source: i.string().optional(), // "manual" | "imported" | "concierge"
    }),
    tdsEntries: i.entity({
      amount: i.number().optional(),
      fy: i.string().optional(), // Financial Year
      hasCertificate: i.boolean().optional(),
      notes: i.string().optional(),
    }),
    estimates: i.entity({
      estimateNumber: i.string().optional(),
      status: i.string().optional(), // "draft" | "shared" | "confirmed" | "converted" | "expired"
      date: i.string().optional(),
      validUntil: i.string().optional(),
      subtotal: i.number().optional(),
      total: i.number().optional(),
      notes: i.string().optional(),
      termsAndConditions: i.string().optional(),
      advanceIntent: i.number().optional(),
      requiresAdvance: i.boolean().optional(),
      advancePercentage: i.number().optional(),
      advanceDeadlineDays: i.number().optional(),
      recipientName: i.string().optional(),
      recipientContact: i.string().optional(),
      createdAt: i.string().optional(),
      updatedAt: i.string().optional(),
    }),
    attachments: i.entity({
      publicId: i.string().unique().indexed().optional(),
      url: i.string().optional(),
      type: i.string().optional(), // "expense_bill" | "invoice_pdf" | "ca_export"
      createdAt: i.string().optional(), // ISO string
    }),
    auditLogs: i.entity({
      adminId: i.string().optional(),
      adminEmail: i.string().optional(),
      action: i.string().optional(), // "delete_user", "create_concierge", etc.
      targetType: i.string().optional(), // "user", "business"
      targetId: i.string().optional(),
      targetName: i.string().optional(),
      timestamp: i.string().optional(), // ISO string
      details: i.string().optional(),
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
    invoicesBankAccount: {
      forward: {
        on: "invoices",
        has: "one",
        label: "bankAccount",
      },
      reverse: {
        on: "bankAccounts",
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
    lineItemsOwner: {
      forward: {
        on: "lineItems",
        has: "one",
        label: "owner",
      },
      reverse: {
        on: "$users",
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
    bankAccountsOwner: {
      forward: {
        on: "bankAccounts",
        has: "one",
        label: "owner",
      },
      reverse: {
        on: "$users",
        has: "many",
        label: "bankAccounts",
      },
    },
    expensesBusiness: {
      forward: {
        on: "expenses",
        has: "one",
        label: "business",
      },
      reverse: {
        on: "businesses",
        has: "many",
        label: "expenses",
      },
    },
    tdsEntriesBusiness: {
      forward: {
        on: "tdsEntries",
        has: "one",
        label: "business",
      },
      reverse: {
        on: "businesses",
        has: "many",
        label: "tdsEntries",
      },
    },
    servicesBusiness: {
      forward: {
        on: "services",
        has: "one",
        label: "business",
      },
      reverse: {
        on: "businesses",
        has: "many",
        label: "services",
      },
    },
    bankAccountsBusiness: {
      forward: {
        on: "bankAccounts",
        has: "one",
        label: "business",
      },
      reverse: {
        on: "businesses",
        has: "many",
        label: "bankAccounts",
      },
    },
    calendarEventsBusiness: {
      forward: {
        on: "calendarEvents",
        has: "one",
        label: "business",
      },
      reverse: {
        on: "businesses",
        has: "many",
        label: "calendarEvents",
      },
    },
    clientsBusiness: {
      forward: {
        on: "clients",
        has: "one",
        label: "business",
      },
      reverse: {
        on: "businesses",
        has: "many",
        label: "clients",
      },
    },
    taxesBusiness: {
      forward: {
        on: "taxes",
        has: "one",
        label: "business",
      },
      reverse: {
        on: "businesses",
        has: "many",
        label: "taxes",
      },
    },
    termsTemplatesBusiness: {
      forward: {
        on: "termsTemplates",
        has: "one",
        label: "business",
      },
      reverse: {
        on: "businesses",
        has: "many",
        label: "termsTemplates",
      },
    },
    estimatesOwner: {
      forward: {
        on: "estimates",
        has: "one",
        label: "owner",
      },
      reverse: {
        on: "$users",
        has: "many",
        label: "estimates",
      },
    },
    estimatesClient: {
      forward: {
        on: "estimates",
        has: "one",
        label: "client",
      },
      reverse: {
        on: "clients",
        has: "many",
        label: "estimates",
      },
    },
    estimatesBusiness: {
      forward: {
        on: "estimates",
        has: "one",
        label: "business",
      },
      reverse: {
        on: "businesses",
        has: "many",
        label: "estimates",
      },
    },
    lineItemsEstimate: {
      forward: {
        on: "lineItems",
        has: "one",
        label: "estimate",
        onDelete: "cascade",
      },
      reverse: {
        on: "estimates",
        has: "many",
        label: "lineItems",
      },
    },
    estimateConvertedInvoice: {
      forward: {
        on: "estimates",
        has: "one",
        label: "convertedInvoice",
      },
      reverse: {
        on: "invoices",
        has: "one",
        label: "sourceEstimate",
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
