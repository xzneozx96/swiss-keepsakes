-- Gate G-S8-PICKUP-MAPS (owner, 2026-11-03): every pickup point stores the Google Maps link the merchant pasted and the
-- pin (latitude, longitude) the API read from it, so guests can later open the link for directions (E7.x). The checks
-- are the place ones (migrations 0008 and 0015): an https link with no space, at most 2000 characters, and a pin on the globe.
-- The columns are NOT NULL and have no default on purpose. A database that already holds a pickup point makes this
-- migration fail with "contains null values" and change nothing (DDL runs in one transaction), so no link or pin is
-- ever made up. Dev and the first release hold no pickup points. If another database does, add the points' links and
-- pins by hand first (add the columns as nullable, fill them, then set NOT NULL), or archive and delete those rows.
SET lock_timeout = '3s';--> statement-breakpoint
ALTER TABLE catalog.pickup_places
  ADD COLUMN maps_link text NOT NULL,
  ADD COLUMN latitude double precision NOT NULL,
  ADD COLUMN longitude double precision NOT NULL,
  ADD CONSTRAINT pickup_places_maps_link_check CHECK (maps_link ~ '^https://[^\s]+$' AND length(maps_link) <= 2000),
  ADD CONSTRAINT pickup_places_latitude_check CHECK (latitude BETWEEN -90 AND 90),
  ADD CONSTRAINT pickup_places_longitude_check CHECK (longitude BETWEEN -180 AND 180);
