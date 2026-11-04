SET lock_timeout = '3s';--> statement-breakpoint
-- Owner decision 2026-11-04 (gate G-S9-ICON, ticket T-E4.13a): a map category can carry an icon again, one of a fixed set that
-- the home tiles and the pins without a photo read. Migration 0018 dropped the column (decision 2026-11-02); this adds it back.
-- The keys below are the list `categoryIconGroups` of packages/domain/src/content/category-icon.ts, one line per group, in
-- that order. A test fails when this list and the domain list differ, so change both together (a new key needs a new
-- migration that drops and adds the CHECK, as this one does).
-- Nullable, no default, no backfill: no row changes. Safe to run twice: each step checks what is already there.
ALTER TABLE content.map_categories ADD COLUMN IF NOT EXISTS icon text;--> statement-breakpoint
ALTER TABLE content.map_categories DROP CONSTRAINT IF EXISTS map_categories_icon_check;--> statement-breakpoint
ALTER TABLE content.map_categories
  ADD CONSTRAINT map_categories_icon_check CHECK (icon IS NULL OR icon IN (
    'toilet', 'water', 'wifi', 'locker', 'cash', 'bank', 'info', 'emergency', 'pharmacy', 'hospital', 'post',
    'transport', 'train', 'boat', 'bicycle', 'scooter', 'car', 'airport', 'fuel', 'parking', 'charging', 'taxi',
    'restaurant', 'cafe', 'bar', 'brewery', 'bakery', 'pizza', 'dessert', 'tea', 'market', 'supermarket',
    'landmark', 'church', 'castle', 'tower', 'bridge', 'monument', 'museum', 'viewpoint', 'square', 'old-town', 'photo-spot', 'art', 'theatre', 'library',
    'shop', 'souvenirs', 'watches', 'clothing', 'jewellery', 'books', 'bags',
    'mountain', 'park', 'tree', 'lake', 'snow', 'sun', 'hiking', 'cycling', 'swimming', 'campfire',
    'event', 'festival', 'concert', 'tickets', 'fair', 'sport', 'wellness', 'family', 'pets',
    'holiday', 'hotel', 'laundry', 'tour', 'route', 'walk'));
