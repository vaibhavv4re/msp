// Docs: https://www.instantdb.com/docs/permissions

import type { InstantRules } from "@instantdb/react";

const rules = {
  // Calendar Events - users can only see their own
  calendarEvents: {
    allow: {
      view: "isOwner",
      create: "isAuthenticated",
      update: "isOwner",
      delete: "isOwner",
    },
    bind: [
      "isOwner",
      "auth.id in data.ref('owner.id')",
      "isAuthenticated",
      "auth.id != null",
    ],
  },
  // Clients - users can only see their own customers
  clients: {
    allow: {
      view: "isOwner",
      create: "isAuthenticated",
      update: "isOwner",
      delete: "isOwner",
    },
    bind: [
      "isOwner",
      "auth.id in data.ref('owner.id')",
      "isAuthenticated",
      "auth.id != null",
    ],
  },
  // Invoices - users can only see their own invoices
  invoices: {
    allow: {
      view: "isOwner",
      create: "isAuthenticated",
      update: "isOwner",
      delete: "isOwner",
    },
    bind: [
      "isOwner",
      "auth.id in data.ref('owner.id')",
      "isAuthenticated",
      "auth.id != null",
    ],
  },
  // Line Items - inherit permissions from invoice owner
  lineItems: {
    allow: {
      view: "isInvoiceOwner",
      create: "isAuthenticated",
      update: "isInvoiceOwner",
      delete: "isInvoiceOwner",
    },
    bind: [
      "isInvoiceOwner",
      "auth.id in data.ref('invoice.owner.id')",
      "isAuthenticated",
      "auth.id != null",
    ],
  },
  // Services - users can only see their own services
  services: {
    allow: {
      view: "isOwner",
      create: "isAuthenticated",
      update: "isOwner",
      delete: "isOwner",
    },
    bind: [
      "isOwner",
      "auth.id in data.ref('owner.id')",
      "isAuthenticated",
      "auth.id != null",
    ],
  },
  // Taxes - users can only see their own tax settings
  taxes: {
    allow: {
      view: "isOwner",
      create: "isAuthenticated",
      update: "isOwner",
      delete: "isOwner",
    },
    bind: [
      "isOwner",
      "auth.id in data.ref('owner.id')",
      "isAuthenticated",
      "auth.id != null",
    ],
  },
  // Terms Templates - users can only see their own templates
  termsTemplates: {
    allow: {
      view: "isOwner",
      create: "isAuthenticated",
      update: "isOwner",
      delete: "isOwner",
    },
    bind: [
      "isOwner",
      "auth.id in data.ref('owner.id')",
      "isAuthenticated",
      "auth.id != null",
    ],
  },
} satisfies InstantRules;

export default rules;
