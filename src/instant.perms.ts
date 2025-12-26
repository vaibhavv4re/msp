// Docs: https://www.instantdb.com/docs/permissions

import type { InstantRules } from "@instantdb/react";

const rules = {
  // Calendar Events - users can only see their own
  calendarEvents: {
    allow: {
      view: "auth.id in data.ref('owner.id') || root.ref('$users')[auth.id].role == 'admin'",
      create: "auth.id != null",
      update: "auth.id in data.ref('owner.id') || root.ref('$users')[auth.id].role == 'admin'",
      delete: "auth.id in data.ref('owner.id') || root.ref('$users')[auth.id].role == 'admin'",
    },
  },
  // Clients - users can only see their own customers
  clients: {
    allow: {
      view: "auth.id in data.ref('owner.id') || data.source == 'concierge' || root.ref('$users')[auth.id].role == 'admin'",
      create: "auth.id != null",
      update: "auth.id in data.ref('owner.id') || data.source == 'concierge' || newData.source == 'concierge' || root.ref('$users')[auth.id].role == 'admin'",
      delete: "auth.id in data.ref('owner.id') || data.source == 'concierge' || root.ref('$users')[auth.id].role == 'admin'",
    },
  },
  // Invoices - users can only see their own invoices
  invoices: {
    allow: {
      view: "auth.id in data.ref('owner.id') || data.source == 'concierge' || root.ref('$users')[auth.id].role == 'admin'",
      create: "auth.id != null",
      update: "auth.id in data.ref('owner.id') || data.source == 'concierge' || newData.source == 'concierge' || root.ref('$users')[auth.id].role == 'admin'",
      delete: "auth.id in data.ref('owner.id') || data.source == 'concierge' || root.ref('$users')[auth.id].role == 'admin'",
    },
  },
  // Line Items - inherit permissions from invoice owner
  lineItems: {
    allow: {
      view: "auth.id in data.ref('invoice.owner.id') || data.ref('invoice.source') == 'concierge' || root.ref('$users')[auth.id].role == 'admin'",
      create: "auth.id != null",
      update: "auth.id in data.ref('invoice.owner.id') || data.ref('invoice.source') == 'concierge' || newData.ref('invoice.source') == 'concierge' || root.ref('$users')[auth.id].role == 'admin'",
      delete: "auth.id in data.ref('invoice.owner.id') || root.ref('$users')[auth.id].role == 'admin'",
    },
  },
  // Services - users can only see their own services
  services: {
    allow: {
      view: "auth.id in data.ref('owner.id') || root.ref('$users')[auth.id].role == 'admin'",
      create: "auth.id != null",
      update: "auth.id in data.ref('owner.id') || root.ref('$users')[auth.id].role == 'admin'",
      delete: "auth.id in data.ref('owner.id') || root.ref('$users')[auth.id].role == 'admin'",
    },
  },
  // Taxes - users can only see their own tax settings
  taxes: {
    allow: {
      view: "auth.id in data.ref('owner.id') || root.ref('$users')[auth.id].role == 'admin'",
      create: "auth.id != null",
      update: "auth.id in data.ref('owner.id') || root.ref('$users')[auth.id].role == 'admin'",
      delete: "auth.id in data.ref('owner.id') || root.ref('$users')[auth.id].role == 'admin'",
    },
  },
  // Terms Templates - users can only see their own templates
  termsTemplates: {
    allow: {
      view: "auth.id in data.ref('owner.id') || root.ref('$users')[auth.id].role == 'admin'",
      create: "auth.id != null",
      update: "auth.id in data.ref('owner.id') || root.ref('$users')[auth.id].role == 'admin'",
      delete: "auth.id in data.ref('owner.id') || root.ref('$users')[auth.id].role == 'admin'",
    },
  },
  // Businesses - critical for concierge and profile management
  businesses: {
    allow: {
      view: "auth.id in data.ref('owner.id') || auth.email == data.email || data.createdBy == 'admin' || root.ref('$users')[auth.id].role == 'admin'",
      create: "auth.id != null",
      update: "auth.id in data.ref('owner.id') || auth.email == newData.email || data.createdBy == 'admin' || newData.createdBy == 'admin' || root.ref('$users')[auth.id].role == 'admin'",
      delete: "auth.id in data.ref('owner.id') || data.createdBy == 'admin' || root.ref('$users')[auth.id].role == 'admin'",
    },
  },
  // Bank Accounts
  bankAccounts: {
    allow: {
      view: "auth.id in data.ref('owner.id') || root.ref('$users')[auth.id].role == 'admin'",
      create: "auth.id != null",
      update: "auth.id in data.ref('owner.id') || root.ref('$users')[auth.id].role == 'admin'",
      delete: "auth.id in data.ref('owner.id') || root.ref('$users')[auth.id].role == 'admin'",
    },
  },
  // Expenses
  expenses: {
    allow: {
      view: "auth.id in data.ref('owner.id') || data.source == 'concierge' || root.ref('$users')[auth.id].role == 'admin'",
      create: "auth.id != null",
      update: "auth.id in data.ref('owner.id') || data.source == 'concierge' || newData.source == 'concierge' || root.ref('$users')[auth.id].role == 'admin'",
      delete: "auth.id in data.ref('owner.id') || root.ref('$users')[auth.id].role == 'admin'",
    },
  },
  // User profiles - allow role management and profile viewing
  $users: {
    allow: {
      view: "auth.id != null",
      create: "false", // Handled by InstantDB auth
      update: "auth.id == data.id || root.ref('$users')[auth.id].role == 'admin'",
      delete: "root.ref('$users')[auth.id].role == 'admin'",
    },
  },
} satisfies InstantRules;

export default rules;
