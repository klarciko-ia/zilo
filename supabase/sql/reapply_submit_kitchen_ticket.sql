-- Run in Supabase SQL editor if you already applied migration 0003 before the menu_item_id FK fix.
-- Safe to run multiple times (replaces functions).

create or replace function resolve_menu_item_fk(p_raw text)
returns uuid
language plpgsql
stable
as $$
declare
  v uuid;
begin
  if p_raw is null or btrim(p_raw) = '' then
    return null;
  end if;
  begin
    v := p_raw::uuid;
  exception
    when invalid_text_representation then
      return null;
  end;
  return (select mi.id from menu_items mi where mi.id = v limit 1);
end;
$$;

grant execute on function resolve_menu_item_fk(text) to anon, authenticated, service_role;

create or replace function submit_kitchen_ticket(p_qr_slug text, p_items jsonb)
returns jsonb
language plpgsql
as $$
declare
  v_table_id uuid;
  v_restaurant_id uuid;
  v_kitchen_id uuid;
  v_order_id uuid;
  el jsonb;
  v_line_qty int;
  v_line_price numeric;
  v_line_name text;
  v_line_menu_id uuid;
  v_line_total numeric;
  v_added_total numeric := 0;
  oi record;
begin
  select id, restaurant_id into v_table_id, v_restaurant_id
  from restaurant_tables where qr_slug = p_qr_slug;
  if v_table_id is null then
    return jsonb_build_object('error', 'TABLE_NOT_FOUND');
  end if;

  if p_items is null or jsonb_array_length(p_items) < 1 then
    return jsonb_build_object('error', 'ITEMS_REQUIRED');
  end if;

  for el in select * from jsonb_array_elements(p_items)
  loop
    if (el->>'menuItemId') is null or (el->>'name') is null
       or (el->>'unitPrice') is null or (el->>'quantity') is null then
      return jsonb_build_object('error', 'INVALID_ITEM');
    end if;
    v_line_price := (el->>'unitPrice')::numeric;
    v_line_qty := (el->>'quantity')::int;
    if v_line_qty < 1 then
      return jsonb_build_object('error', 'INVALID_QUANTITY');
    end if;
    v_added_total := v_added_total + (v_line_price * v_line_qty);
  end loop;

  insert into kitchen_orders (restaurant_id, table_id, status)
  values (v_restaurant_id, v_table_id, 'new')
  returning id into v_kitchen_id;

  for el in select * from jsonb_array_elements(p_items)
  loop
    v_line_menu_id := resolve_menu_item_fk(el->>'menuItemId');
    v_line_name := el->>'name';
    v_line_price := (el->>'unitPrice')::numeric;
    v_line_qty := (el->>'quantity')::int;
    v_line_total := v_line_price * v_line_qty;

    insert into kitchen_order_items (kitchen_order_id, menu_item_id, name, unit_price, quantity)
    values (v_kitchen_id, v_line_menu_id, v_line_name, v_line_price, v_line_qty);
  end loop;

  select id into v_order_id
  from table_orders
  where table_id = v_table_id and status <> 'paid'::table_order_status
  order by created_at desc
  limit 1;

  if v_order_id is null then
    insert into table_orders (restaurant_id, table_id, status, total_amount, amount_paid, amount_cash_pending, remaining_amount)
    values (v_restaurant_id, v_table_id, 'unpaid', v_added_total, 0, 0, v_added_total)
    returning id into v_order_id;

    for el in select * from jsonb_array_elements(p_items)
    loop
      v_line_menu_id := resolve_menu_item_fk(el->>'menuItemId');
      v_line_name := el->>'name';
      v_line_price := (el->>'unitPrice')::numeric;
      v_line_qty := (el->>'quantity')::int;
      v_line_total := v_line_price * v_line_qty;

      insert into order_items (order_id, menu_item_id, name, unit_price, quantity_total, quantity_paid, quantity_remaining, total_price)
      values (v_order_id, v_line_menu_id, v_line_name, v_line_price, v_line_qty, 0, v_line_qty, v_line_total);
    end loop;
  else
    for el in select * from jsonb_array_elements(p_items)
    loop
      v_line_menu_id := resolve_menu_item_fk(el->>'menuItemId');
      v_line_name := el->>'name';
      v_line_price := (el->>'unitPrice')::numeric;
      v_line_qty := (el->>'quantity')::int;
      v_line_total := v_line_price * v_line_qty;

      if v_line_menu_id is null then
        insert into order_items (order_id, menu_item_id, name, unit_price, quantity_total, quantity_paid, quantity_remaining, total_price)
        values (v_order_id, null, v_line_name, v_line_price, v_line_qty, 0, v_line_qty, v_line_total);
      else
        select * into oi from order_items
        where order_id = v_order_id and menu_item_id = v_line_menu_id
        limit 1;

        if not found then
          insert into order_items (order_id, menu_item_id, name, unit_price, quantity_total, quantity_paid, quantity_remaining, total_price)
          values (v_order_id, v_line_menu_id, v_line_name, v_line_price, v_line_qty, 0, v_line_qty, v_line_total);
        else
          update order_items set
            quantity_total = quantity_total + v_line_qty,
            quantity_remaining = quantity_remaining + v_line_qty,
            total_price = total_price + v_line_total
          where id = oi.id;
        end if;
      end if;
    end loop;

    update table_orders set
      total_amount = total_amount + v_added_total,
      remaining_amount = remaining_amount + v_added_total,
      updated_at = now()
    where id = v_order_id;
  end if;

  return jsonb_build_object(
    'kitchenOrderId', v_kitchen_id,
    'tableOrderId', v_order_id
  );
end;
$$;

grant execute on function submit_kitchen_ticket(text, jsonb) to anon, authenticated, service_role;
