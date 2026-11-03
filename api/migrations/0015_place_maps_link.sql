SET lock_timeout = '3s';--> statement-breakpoint
-- Owner decision 2026-11-02: a place stores the Google Maps link the merchant pasted, so the editor shows it again after
-- a reload and the guest map's "Open in Google Maps" opens that link (the business card) instead of a bare position.
-- A typed column like address, stay_tag and the outbound link: a change is live, no draft step (ADR-014). The API
-- accepts only a Google Maps link; the database checks the shape (https, no space, at most 2000 characters).
-- Added empty, so nothing is rewritten and every stored place keeps the position URL until a link is saved.
ALTER TABLE content.places
  ADD COLUMN maps_link text,
  ADD CONSTRAINT places_maps_link_check CHECK (maps_link IS NULL OR (maps_link ~ '^https://[^\s]+$' AND length(maps_link) <= 2000));
