// Docs: https://www.instantdb.com/docs/permissions

import type { InstantRules } from "@instantdb/react";

const rules = {
  $files: { allow: { view: "true", create: "true", update: "true", delete: "true" } },
  calendarEvents: { allow: { view: "true", create: "true", update: "true", delete: "true" } },
  clients: { allow: { view: "true", create: "true", update: "true", delete: "true" } },
  invoices: { allow: { view: "true", create: "true", update: "true", delete: "true" } },
  lineItems: { allow: { view: "true", create: "true", update: "true", delete: "true" } },
  estimates: { allow: { view: "true", create: "true", update: "true", delete: "true" } },
  services: { allow: { view: "true", create: "true", update: "true", delete: "true" } },
  taxes: { allow: { view: "true", create: "true", update: "true", delete: "true" } },
  termsTemplates: { allow: { view: "true", create: "true", update: "true", delete: "true" } },
  taxSettings: { allow: { view: "true", create: "true", update: "true", delete: "true" } },
  businesses: { allow: { view: "true", create: "true", update: "true", delete: "true" } },
  bankAccounts: { allow: { view: "true", create: "true", update: "true", delete: "true" } },
  expenses: { allow: { view: "true", create: "true", update: "true", delete: "true" } },
  tdsEntries: { allow: { view: "true", create: "true", update: "true", delete: "true" } },
  attachments: { allow: { view: "true", create: "true", update: "true", delete: "true" } },
  $users: { allow: { view: "true", create: "false", update: "true", delete: "false" } },
  auditLogs: { allow: { view: "true", create: "true", update: "true", delete: "true" } },
  rooms: { allow: { view: "true", create: "true", update: "true", delete: "true" } },
} satisfies InstantRules;

export default rules;
