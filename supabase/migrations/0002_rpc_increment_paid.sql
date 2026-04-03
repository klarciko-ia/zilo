create or replace function increment_order_item_paid(
  p_order_item_id uuid,
  p_quantity int
) returns void as $$
begin
  update order_items
  set
    quantity_paid = quantity_paid + p_quantity,
    quantity_remaining = quantity_remaining - p_quantity
  where id = p_order_item_id;
end;
$$ language plpgsql;
