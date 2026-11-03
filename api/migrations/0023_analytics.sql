-- ADR-032 (gates G-S8-ADR032 and G-S8-FUNNELS, 2026-11-03): anonymous visitor events go to PostHog EU, so this schema holds
-- one table only, the per-day order count PostHog never receives. No account, order, partner, referral, session, address
-- or exact time. The events table, daily_counts and the roll-up of the earlier design are not created (DM-10).
-- The function takes the referrer class and segment from the order request, so nothing reads a session.
-- Numbers 0021 and 0022 belong to other tickets; drizzle orders by the journal's `when`.
SET lock_timeout = '3s';--> statement-breakpoint
CREATE SCHEMA analytics;--> statement-breakpoint
CREATE TABLE analytics.daily_funnels (
  day            date NOT NULL,
  referrer_class text NOT NULL,
  segment        text,
  order_submits  bigint DEFAULT 0 NOT NULL,
  CONSTRAINT daily_funnels_key UNIQUE NULLS NOT DISTINCT (day, referrer_class, segment),
  CONSTRAINT daily_funnels_referrer_check CHECK (referrer_class IN ('search', 'partner', 'social', 'direct', 'other')),
  CONSTRAINT daily_funnels_segment_check CHECK (segment IN ('short_stay', 'multi_day')),
  CONSTRAINT daily_funnels_counts_check CHECK (order_submits >= 0)
);--> statement-breakpoint
-- Count one order_submit for the caller's day (the Europe/Zurich day). One statement, so parallel calls do not lose a count.
-- A value outside the CHECKs fails the INSERT and changes no row. The function stores nothing about the order.
CREATE FUNCTION analytics.record_order_submit(p_day date, p_referrer_class text, p_segment text) RETURNS void LANGUAGE sql AS $$
  INSERT INTO analytics.daily_funnels AS f (day, referrer_class, segment, order_submits)
    VALUES (p_day, p_referrer_class, p_segment, 1)
    ON CONFLICT (day, referrer_class, segment)
    DO UPDATE SET order_submits = f.order_submits + 1
$$;
