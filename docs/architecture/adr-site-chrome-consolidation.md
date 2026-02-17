# ADR: Consolidate Site Chrome into Vercel

[← Docs index](../README.md)

**Status:** Accepted  
**Date:** 2026-02

## Context

Historically, GoDaddy hosted the **header, footer, hero**, and the Ecwid
storefront, while the **application** (Join, profiles, admin, Feed) lived in
Vercel/Supabase. This split:

- Increased cognitive load and deployment complexity
- Encouraged duplicated navigation and branding logic
- Made it harder to evolve the product experience consistently

WRDLNKDN now uses a React + Vite app on Vercel as the primary product surface.

## Decision

- **Vercel** is the **source of truth** for the user-facing product experience
  (navigation, layout, hero, and all non-commerce flows).
- **GoDaddy** is reduced to:
  - Domain and DNS management
  - Optional, lightweight marketing landing pages with no shared UI components
- **Ecwid + Printful** remain the systems of record for:
  - Merchandise catalog
  - Orders, taxes, and payments
  - Fulfillment and shipping

Site chrome (header, footer, and hero) is implemented and rendered **inside the
Vercel app**, shared across all core pages.

## Implementation

- **Header:** `Navbar` in `src/components/layout/Navbar.tsx` is the primary
  navigation surface for the app and storefront.
- **Footer:** Shared `Footer` component in `src/components/layout/Footer.tsx` is
  rendered by `Layout` across core pages.
- **Hero:** The primary hero experience (background, CTA) is implemented in the
  React `Home` page and no longer depends on GoDaddy templates.
- **Storefront:** The Ecwid storefront is available from the app via a dedicated
  `/store` route. Ecwid + Printful handle cart, checkout, taxes, and
  fulfillment.

## In Scope

- Decide and document platform ownership boundaries (this ADR)
- Ensure header, footer, and hero are rendered from the Vercel app
- Align navigation and branding across app and storefront (via Navbar + Footer)
- Define short-term vs long-term Ecwid integration strategy

## Out of Scope

- Rebuilding commerce flows (cart, checkout, payments) inside the app
- Migrating historical Ecwid data
- SEO strategy or copywriting for marketing pages

## Short-Term vs Long-Term Ecwid Strategy

- **Short term (current):**
  - Provide a clear \"Store\" entry point in app navigation.
  - Ecwid remains a separate system hosting product catalog and checkout.
  - `/store` can either:
    - Embed Ecwid inside the app, or
    - Link out to a dedicated Ecwid-hosted storefront URL.
- **Long term (optional):**
  - Consider a deeper API-driven integration only if merch becomes core to the
    product and justifies added complexity.

## Consequences

- **Positive**
  - Single source of truth for layout and navigation in Vercel
  - Reduced duplication and drift across platforms
  - Clear separation of concerns between app, DNS, and commerce systems
- **Negative / Trade-offs**
  - Additional initial work to rebuild footer/hero in the app
  - Requires coordination when changing brand/navigation (Vercel is now the
    canonical place to do so)

## Definition of Done

- Core site chrome (header, footer, hero) is rendered exclusively from the
  Vercel app.
- GoDaddy is no longer required for shared UI components (header/footer/hero).
- Storefront access is clear and functional from the app.
- This decision is documented (this ADR) and shared with the team.
