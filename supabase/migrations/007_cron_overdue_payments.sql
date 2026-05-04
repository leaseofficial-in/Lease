-- Enable pg_cron (run once as superuser if not already enabled)
-- create extension if not exists pg_cron;

-- Daily job: mark rent payments as overdue when due date has passed and status is still 'pending'
-- Runs at 01:00 UTC every day
select cron.schedule(
  'mark-overdue-payments',
  '0 1 * * *',
  $$
    update rent_payments
    set
      status = 'overdue',
      updated_at = now()
    where
      status = 'pending'
      and (
        -- Extract year+month from the month field, combine with rent_due_day from the rental
        (date_trunc('month', month::date) + ((r.rent_due_day - 1) || ' days')::interval)::date < current_date
      )
    from rentals r
    where r.id = rent_payments.rental_id
      and r.status = 'active';
  $$
);
