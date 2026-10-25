-- Household portions for saved USDA foods, e.g.
-- [{"label": "1 container (6 oz)", "grams": 170}], so a saved food offers
-- them without asking USDA again. Null for recipes and for foods USDA lists
-- no portions for. The table's row-level security policy covers the new
-- column as it does every other.
alter table public.my_foods add column portions jsonb;
