# Mobile Revamp - Core UX Principles

## 🧠 Core UX Principles (Non-Negotiable)

1. **Creation ≠ Modal on mobile**: Full-screen routes for creation flows.
2. **Tabs switch context, not actions**: Use tabs for navigation between views, not for triggering actions.
3. **One primary action per screen**: Focus on a single goal per view.
4. **Mobile gets full screens, web keeps density**: Optimize for the device's strengths.
5. **No loss of power features**: All desktop functionality must be accessible on mobile.

## 📱 MODALS — New Rules

### ❌ On Mobile (Strict)
Do NOT use modals for:
- Invoice creation
- Estimate creation
- Expense capture
- Profile creation
- Customer (Client) creation

These must be full-screen routes.

### ✅ On Mobile (Allowed)
Use modals / bottom sheets only for:
- Selecting a client
- Choosing a template
- Filters
- Confirmations (“Delete?”, “Discard?”)

**Rule of thumb:** If it has more than 5 inputs → not a modal.

## 🧭 ROUTING GUIDELINES
The following canonical routes must exist and work everywhere:
- `/work/estimates/new`
- `/work/invoices/new`
- `/expenses/new`
- `/profile/setup`

### Desktop
- Can open these in modal / drawer.
- URL should still change for deep linking and refresh safety.

### Mobile
- Always navigate to full-screen page.
- No overlay.

---
*Note: This branch focuses solely on UX/UI improvements. No changes to business logic, data models, or user flows.*

---

# Welcome to your InstantDB NextJS app 👋

This is a NextJS project scaffolded with create-instant-app.

To run the development server:
`npm run dev`

To push schema changes:
`npx instant-cli push`

To pull schema changes:
`npx instant-cli pull`


npx instant-cli push schema --app de7c2b8b-3347-4e1a-ace1-7aa2fab5854d --token 49e4f288-330e-4093-a133-41bd0d091a18 --yes


Got any feedback or questions? Join our [Discord](https://discord.gg/hgVf9R6SBm)
