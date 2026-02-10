# Ecommerce and Storefront Integration for WRDLNKDN

This epic defines the work required to deliver a cohesive ecommerce and
storefront experience for WRDLNKDN while minimizing technical risk and
operational complexity.

The core **MVP delivery path** is an **embed-first approach**, integrating the
existing Ecwid storefront directly into the Vercel application. This approach
prioritizes speed, stability, and maintainability, and preserves Ecwid and
Printful as the systems of record for products, pricing, taxes, payments, and
fulfillment.

Deeper rebuilds or API-driven storefront implementations are **explicitly out of
scope for MVP** and may be considered in future phases based on usage, demand,
and business needs.

---

## 1. Business Value

- Enables merchandise sales quickly with minimal engineering effort
- Creates a unified and branded storefront experience
- Avoids premature reinvention of complex commerce logic
- Preserves proven fulfillment and tax workflows

---

## 2. MVP Strategy

- Embed Ecwid storefront within the Vercel app under a `/store` route
- Use native WRDLNKDN layout, navigation, and branding
- Delegate cart, checkout, and order management entirely to Ecwid
- Provide a clear return path to the app after checkout

---

## 3. In Scope (MVP)

- Embedded Ecwid storefront experience
- Store landing page and category navigation
- Product browsing within embed
- Checkout handoff to Ecwid
- Environment-specific configuration for UAT and Production
- Basic analytics for storefront interactions

---

## 4. Out of Scope (MVP)

- Rebuilding product catalog, cart, checkout, or payment logic
- Migrating historical orders or customer data
- Custom pricing or entitlement logic
- Marketplace or multi-vendor functionality

---

## 5. Epic Acceptance Criteria

- Ecwid storefront is embedded and accessible within the Vercel application.
- Storefront uses WRDLNKDN header, footer, and navigation.
- Users can browse products and complete purchases end to end.
- Checkout is handled entirely by Ecwid without custom payment logic.
- Users return cleanly to the WRDLNKDN app after checkout.
- No commerce secrets or privileged keys are exposed client-side.
- Storefront behaves consistently across UAT and Production.
- MVP scope is documented and future expansion paths are noted.

---

## 6. Dependencies

- Active Ecwid storefront
- Existing Printful integration via Ecwid
- Vercel app routing and layout components
- Domain and DNS configuration
- Brand styles and navigation definitions

---

## 7. Definition of Done

- MVP storefront is live inside the WRDLNKDN app
- Purchases can be completed without leaving the branded experience
- No reliance on GoDaddy-hosted storefront pages for core flows
- Stakeholders can validate the end-to-end commerce experience
- Embed-first MVP approach is documented and agreed upon
