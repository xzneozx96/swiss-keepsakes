SET lock_timeout = '3s';--> statement-breakpoint
-- Owner decision 2026-11-02 (docs/decisions/2026-11-02-map-category-icons.md): a map category can carry an icon, one of a
-- fixed set, and a "Show on the home" switch (the home's "Sorted before you unpack" row will list those). A place with no
-- photo shows the icon of its first category that has one. The two typed columns on the place (0010) go, after their
-- values become category links. The icon keys are the list `categoryIcons` in packages/domain/src/content/category-icon.ts.
-- Safe to run twice: each step checks what is already there, and the backfill runs only while the old columns exist.
ALTER TABLE content.map_categories ADD COLUMN IF NOT EXISTS icon text;--> statement-breakpoint
ALTER TABLE content.map_categories ADD COLUMN IF NOT EXISTS show_on_home boolean NOT NULL DEFAULT false;--> statement-breakpoint
ALTER TABLE content.map_categories DROP CONSTRAINT IF EXISTS map_categories_icon_check;--> statement-breakpoint
ALTER TABLE content.map_categories
  ADD CONSTRAINT map_categories_icon_check CHECK (icon IS NULL OR icon IN (
    'toilet', 'water', 'wifi', 'transport', 'locker', 'cash',
    'restaurant', 'cafe', 'bar', 'market', 'supermarket', 'shop',
    'landmark', 'church', 'bridge', 'monument', 'museum', 'viewpoint', 'square',
    'info', 'holiday', 'emergency', 'boat', 'mountain'));--> statement-breakpoint
-- Copy every stored value: the pin is linked to a category of its store with the matching icon. A store with none gives the
-- icon to the categories whose name says it (EN or DE), and when no name matches, gets a top-level category named after the
-- value. The six service values also switch "Show on the home" on, as the home row listed them before.
DO $migrate$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'content' AND table_name = 'places' AND column_name = 'service_type') THEN
    DROP TABLE IF EXISTS pg_temp.pin_roles;
    DROP TABLE IF EXISTS pg_temp.role_names;
    DROP TABLE IF EXISTS pg_temp.role_labels;
    DROP TABLE IF EXISTS pg_temp.role_icons;
    CREATE TEMP TABLE pin_roles ON COMMIT DROP AS
      SELECT p.store_id, p.id AS place_id, r.role
        FROM content.places p
        CROSS JOIN LATERAL (VALUES (p.service_type), (p.food_kind)) AS r(role)
       WHERE r.role IS NOT NULL;
    -- The category icon of each stored value, and whether the home row listed it.
    CREATE TEMP TABLE role_icons ON COMMIT DROP AS
      SELECT * FROM (VALUES
        ('water', 'water', true), ('toilets', 'toilet', true), ('connect', 'wifi', true),
        ('transport', 'transport', true), ('lockers', 'locker', true), ('cash', 'cash', true),
        ('restaurant', 'restaurant', false), ('cafe-bakery', 'cafe', false), ('pub-bar', 'bar', false), ('market', 'market', false)
      ) AS v(role, icon, on_home);
    -- The names, lower case, that a category of each value usually has.
    CREATE TEMP TABLE role_names ON COMMIT DROP AS
      SELECT * FROM (VALUES
        ('water', 'drinking water'), ('water', 'water'), ('water', 'trinkwasser'), ('water', 'wasser'),
        ('toilets', 'toilets'), ('toilets', 'toilet'), ('toilets', 'toiletten'), ('toilets', 'wc'),
        ('connect', 'connect'), ('connect', 'sim and wi-fi'), ('connect', 'sim and wifi'), ('connect', 'wi-fi'), ('connect', 'wifi'), ('connect', 'sim und wlan'), ('connect', 'wlan'),
        ('transport', 'transport'), ('transport', 'public transport'), ('transport', 'öffentlicher verkehr'), ('transport', 'verkehr'),
        ('lockers', 'lockers'), ('lockers', 'luggage lockers'), ('lockers', 'schliessfächer'), ('lockers', 'gepäck'),
        ('cash', 'cash'), ('cash', 'atms'), ('cash', 'cash machines'), ('cash', 'geldautomaten'), ('cash', 'bancomat'),
        ('restaurant', 'restaurants'), ('restaurant', 'restaurant'),
        ('cafe-bakery', 'bakeries'), ('cafe-bakery', 'bakery'), ('cafe-bakery', 'cafés'), ('cafe-bakery', 'cafes'), ('cafe-bakery', 'cafés and bakeries'), ('cafe-bakery', 'bäckereien'), ('cafe-bakery', 'cafés und bäckereien'),
        ('pub-bar', 'pubs'), ('pub-bar', 'bars'), ('pub-bar', 'pubs and bars'), ('pub-bar', 'bars and pubs'), ('pub-bar', 'pubs und bars'),
        ('market', 'markets'), ('market', 'market'), ('market', 'märkte'), ('market', 'markt')
      ) AS v(role, name);
    CREATE TEMP TABLE role_labels ON COMMIT DROP AS
      SELECT * FROM (VALUES
        ('water', 'Drinking water', 'Trinkwasser'),
        ('toilets', 'Toilets', 'Toiletten'),
        ('connect', 'SIM and Wi-Fi', 'SIM und WLAN'),
        ('transport', 'Public transport', 'Öffentlicher Verkehr'),
        ('lockers', 'Lockers', 'Schliessfächer'),
        ('cash', 'Cash machines', 'Geldautomaten'),
        ('restaurant', 'Restaurants', 'Restaurants'),
        ('cafe-bakery', 'Cafés and bakeries', 'Cafés und Bäckereien'),
        ('pub-bar', 'Pubs and bars', 'Pubs und Bars'),
        ('market', 'Markets', 'Märkte')
      ) AS v(role, en, de);

    -- 1. The store has no category with the icon yet: the categories named like the value get it.
    UPDATE content.map_categories c
       SET icon = i.icon, show_on_home = i.on_home, updated_at = now()
      FROM (SELECT DISTINCT store_id, role FROM pin_roles) d
      JOIN role_names n ON n.role = d.role
      JOIN role_icons i ON i.role = d.role
     WHERE c.store_id = d.store_id
       AND c.icon IS NULL
       AND (lower(c.name ->> 'en') = n.name OR lower(c.name ->> 'de') = n.name)
       AND NOT EXISTS (SELECT 1 FROM content.map_categories k WHERE k.store_id = d.store_id AND k.icon = i.icon);

    -- 2. Still none: a top-level category named after the value, last among the top level. The slug is the value.
    INSERT INTO content.map_categories (store_id, name, slug, position, icon, show_on_home)
      SELECT d.store_id,
             jsonb_build_object('en', l.en, 'de', l.de),
             CASE WHEN EXISTS (SELECT 1 FROM content.map_categories s WHERE s.store_id = d.store_id AND s.slug = d.role)
                  THEN d.role || '-icon' ELSE d.role END,
             coalesce((SELECT max(r.position) FROM content.map_categories r WHERE r.store_id = d.store_id AND r.parent_id IS NULL), 0)
               + row_number() OVER (PARTITION BY d.store_id ORDER BY d.role),
             i.icon, i.on_home
        FROM (SELECT DISTINCT store_id, role FROM pin_roles) d
        JOIN role_labels l ON l.role = d.role
        JOIN role_icons i ON i.role = d.role
       WHERE NOT EXISTS (SELECT 1 FROM content.map_categories k WHERE k.store_id = d.store_id AND k.icon = i.icon);

    -- 3. Link each pin to a category with its icon, unless one of its categories already has it (its own or its parent's).
    INSERT INTO content.place_categories (place_id, category_id, store_id)
      SELECT pr.place_id,
             (SELECT k.id FROM content.map_categories k
               WHERE k.store_id = pr.store_id AND k.icon = i.icon
               ORDER BY (k.parent_id IS NULL), k.position, k.id LIMIT 1),
             pr.store_id
        FROM pin_roles pr
        JOIN role_icons i ON i.role = pr.role
       WHERE NOT EXISTS (
         SELECT 1 FROM content.place_categories pc
           JOIN content.map_categories c ON c.store_id = pc.store_id AND c.id = pc.category_id
           LEFT JOIN content.map_categories par ON par.store_id = c.store_id AND par.id = c.parent_id
          WHERE pc.place_id = pr.place_id AND coalesce(c.icon, par.icon) = i.icon)
      ON CONFLICT DO NOTHING;
  END IF;
END
$migrate$;--> statement-breakpoint
ALTER TABLE content.places DROP COLUMN IF EXISTS service_type, DROP COLUMN IF EXISTS food_kind;
