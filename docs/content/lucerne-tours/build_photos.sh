#!/usr/bin/env bash
# Run: bash build_photos.sh. Builds the Lucerne tour photos (1200x900 JPEG, 4:3) from the downloaded sources into
# front-end/src/assets/photos. Format: slug | source (relative to this folder) | gravity | y-offset-% (optional)
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
out="$here/../../../front-end/src/assets/photos"
while IFS='|' read -r slug src gravity; do
  [ -z "$slug" ] && continue
  if [[ "$gravity" == crop:* ]]; then
    convert "$here/$src" -auto-orient -crop "${gravity#crop:}" +repage -resize 1200x900 \
      -strip -interlace Plane -quality 82 "$out/$slug.jpg"
  else
    convert "$here/$src" -auto-orient -resize '1200x900^' -gravity "$gravity" -extent 1200x900 \
      -strip -interlace Plane -quality 82 "$out/$slug.jpg"
  fi
  echo "$slug $(identify -format '%wx%h %b' "$out/$slug.jpg")"
done <<'LIST'
kornmarkt|images-commons/kornmarkt/Das_Rathaus_in_Luzern.jpg|North
weinmarkt|images-commons/weinmarkt/Luzern_-_Weinmarkt.jpg|Center
hirschenplatz|images-commons/hirschenplatz/Switzerland-03472_-_Hirschenplatz_Square_(23216544653).jpg|Center
victorinox-store|images-commons/victorinox-store/Lucerne_Hirschenplatz_12.jpg|crop:1920x1440+0+1000
zytturm|images-commons/musegg-zyt/Zytturm(1).jpg|Center
hofkirche|images-commons/hofkirche/Luzern_-_Hofkirche_St._Leodegar_-_March_2019_(2).jpg|Center
old-swiss-house|images-commons/old-swiss-house/Switzerland-03276_-_Old_Swiss_House_(23733914622).jpg|Center
jesuit-church|images/jesuit-church/unsplash-mahajan.jpg|Center
ritter-palace|images-commons/ritter-palace/Ehemaliger_Ritter'scher_Palast_(Regierungsgebäude_Bahnhofstrasse_15,_P1010087_01).jpg|Center
suidter-pharmacy|images-commons/suidter-pharmacy/Lucerne_Alte_Suidtersche_Apotheke.jpg|Center
furka-rhone-glacier|images-commons/furka/Rhone-Glacier-Furka.jpg|Center
furka-hairpins|images/furka/unsplash-trad-belvedere.jpg|Center
grimsel-hospiz|images-commons/grimsel/Grimsel_Hospiz_Hotel.jpg|Center
grimsel-dam|images-commons/grimsel/KWO-Grimselsee-Dam.jpg|Center
susten-steinsee|images-commons/susten/Steingletscher_Steinsee_Sustenpass.jpg|Center
gotthard-devils-bridge|images-commons/gotthard/Schöllenen_-_Teufelsbrücke_(9546314996).jpg|Center
gotthard-tremola|images-commons/gotthard/Gotthard_Alte_Passstrasse.jpg|Center
nufenen-pass|images-commons/nufenen/Tessin_Nufenenpass_09.jpg|Center
rothorn-steam|images-commons/brienzer-rothorn/Brienzer_Rothornbahn_Dampfzug_2013.jpg|Center
rothorn-view|images/brienzer-rothorn/rothorn-timon-studler.jpg|Center
finsterwald-entlebuch|images-commons/finsterwald-honey/UNESCO_Biosphäre_Entlebuch_12.jpg|Center
finsterwald-beehouse|images-commons/finsterwald-honey/Bienenstand_OW_021_Bienenhaltung_im_Kanton_Obwalden.jpg|Center
LIST
