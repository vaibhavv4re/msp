// Docs: https://www.instantdb.com/docs/permissions

import type { InstantRules } from "@instantdb/react";

const rules = {
  // Calendar Events - users can only see their own
  calendarEvents: {
    allow: {
      view: "auth.id in data.ref('owner.id')",
      create: "auth.id != null",
      update: "auth.id in data.ref('owner.id')",
      delete: "auth.id in data.ref('owner.id')",
    },
  },
  // Clients - users can only see their own customers
  clients: {
    allow: {
      view: "auth.id in data.ref('owner.id')",
      create: "auth.id != null",
      update: "auth.id in data.ref('owner.id')",
      delete: "auth.id in data.ref('owner.id')",
    },
  },
  // Invoices - users can only see their own invoices
  invoices: {
    allow: {
      view: "auth.id in data.ref('owner.id')",
      create: "auth.id != null",
      update: "auth.id in data.ref('owner.id')",
      delete: "auth.id in data.ref('owner.id')",
    },
  },
  // Line Items - inherit permissions from invoice owner
  lineItems: {
    allow: {
      view: "auth.id in data.ref('invoice.owner.id')",
      create: "auth.id != null",
      update: "auth.id in data.ref('invoice.owner.id')",
      delete: "auth.id in data.ref('invoice.owner.id')",
    },
  },
  // Services - users can only see their own services
  services: {
    allow: {
      view: "auth.id in data.ref('owner.id')",
      create: "auth.id != null",
      update: "auth.id in data.ref('owner.id')",
      delete: "auth.id in data.ref('owner.id')",
    },
  },
  // Taxes - users can only see their own tax settings
  taxes: {
    allow: {
      view: "auth.id in data.ref('owner.id')",
      create: "auth.id != null",
      update: "auth.id in data.ref('owner.id')",
      delete: "auth.id in data.ref('owner.id')",
    },
  },
  // Terms Templates - users can only see their own templates
  termsTemplates: {
    allow: {
      view: "auth.id in data.ref('owner.id')",
      create: "auth.id != null",
      update: "auth.id in data.ref('owner.id')",
      delete: "auth.id in data.ref('owner.id')",
    },
  },
} satisfies InstantRules;

export default rules;
