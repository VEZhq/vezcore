drop policy if exists vv_faq_categories_public_select on public.vv_faq_categories;
create policy vv_faq_categories_public_select
on public.vv_faq_categories
for select
to anon
using (is_active = true);

drop policy if exists vv_faq_items_public_select on public.vv_faq_items;
create policy vv_faq_items_public_select
on public.vv_faq_items
for select
to anon
using (is_active = true);
