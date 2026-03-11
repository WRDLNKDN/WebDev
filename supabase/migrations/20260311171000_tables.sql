-- Enforce the single-category portfolio model for future writes without
-- rewriting any existing portfolio_items rows.

alter table public.portfolio_items
  drop constraint if exists portfolio_items_single_category_check;

alter table public.portfolio_items
  add constraint portfolio_items_single_category_check
  check (cardinality(coalesce(tech_stack, '{}'::text[])) <= 1)
  not valid;
