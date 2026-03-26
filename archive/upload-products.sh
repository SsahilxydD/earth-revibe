#!/bin/bash
# Upload 12 products to Supabase: storage + products + product_images + product_variants

SUPABASE_URL="https://pahlcltpwzsqdclizdtl.supabase.co"
SUPABASE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhaGxjbHRwd3pzcWRjbGl6ZHRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mjc4OTc4MywiZXhwIjoyMDg4MzY1NzgzfQ.d1ule-2QQLESaILH8-fBqBN5FwoJhU4bBw8oJV8p-vY"
CATEGORY_ID="cmn03vqg60001xn1rpahtu82q"
ARCHIVE_DIR="c:/work/earth_revibe/archive"

HEADERS=(-H "apikey: $SUPABASE_KEY" -H "Authorization: Bearer $SUPABASE_KEY")

upload_image() {
  local file_path="$1"
  local storage_path="$2"
  local filename=$(basename "$file_path")
  local ext="${filename##*.}"
  local mime="image/png"
  [[ "$ext" == "jpeg" || "$ext" == "jpg" ]] && mime="image/jpeg"

  echo "  Uploading $filename..."
  curl -s -X POST \
    "$SUPABASE_URL/storage/v1/object/product-images/$storage_path/$filename" \
    "${HEADERS[@]}" \
    -H "Content-Type: $mime" \
    -H "x-upsert: true" \
    --data-binary "@$file_path" > /dev/null

  echo "$SUPABASE_URL/storage/v1/object/public/product-images/$storage_path/$filename"
}

insert_product() {
  local name="$1"
  local slug="$2"
  local description="$3"
  local short_desc="$4"

  local response=$(curl -s -X POST "$SUPABASE_URL/rest/v1/products" \
    "${HEADERS[@]}" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=representation" \
    -d "{
      \"name\": \"$name\",
      \"slug\": \"$slug\",
      \"description\": \"$description\",
      \"shortDescription\": \"$short_desc\",
      \"price\": 1449,
      \"compareAtPrice\": 1999,
      \"material\": \"100% Cotton Linen Blend\",
      \"careInstructions\": \"Machine Cold Wash, No Bleaching\",
      \"returnsInfo\": \"72 Hours Hassle Free Returns and Exchange\",
      \"shippingInfo\": \"Free Delivery Only on Prepaid Orders\",
      \"origin\": \"Proudly Made in India\",
      \"composition\": \"100% Cotton Linen Blend\",
      \"measurements\": \"Relaxed Fit\",
      \"fabricWeight\": \"N/A\",
      \"fit\": \"Relaxed Fit Silhouette\",
      \"washInstructions\": \"Machine Cold Wash, No Bleaching\",
      \"status\": \"DRAFT\",
      \"isFeatured\": false,
      \"categoryId\": \"$CATEGORY_ID\"
    }")

  echo "$response" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4
}

insert_image() {
  local product_id="$1"
  local url="$2"
  local sort_order="$3"
  local is_primary="$4"
  local alt_text="$5"

  curl -s -X POST "$SUPABASE_URL/rest/v1/product_images" \
    "${HEADERS[@]}" \
    -H "Content-Type: application/json" \
    -d "{
      \"productId\": \"$product_id\",
      \"url\": \"$url\",
      \"publicId\": \"\",
      \"altText\": \"$alt_text\",
      \"sortOrder\": $sort_order,
      \"isPrimary\": $is_primary
    }" > /dev/null
}

insert_variants() {
  local product_id="$1"
  local name="$2"
  local sizes=("S" "M" "L" "XL" "XXL")

  for i in "${!sizes[@]}"; do
    local size="${sizes[$i]}"
    local sku=$(echo "${name}-${size}" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | sed 's/[^a-z0-9-]//g')

    curl -s -X POST "$SUPABASE_URL/rest/v1/product_variants" \
      "${HEADERS[@]}" \
      -H "Content-Type: application/json" \
      -d "{
        \"productId\": \"$product_id\",
        \"sku\": \"$sku\",
        \"size\": \"$size\",
        \"color\": \"\",
        \"stock\": 25,
        \"lowStockThreshold\": 5,
        \"isActive\": true
      }" > /dev/null
  done
}

echo "=== Earth Revibe Product Upload ==="
echo ""

# Product definitions: folder|name|slug|description|short_description
PRODUCTS=(
  "01-Terra Drift Pocket Shirt|Terra Drift Pocket Shirt|terra-drift-pocket-shirt|Born from the earth beneath your feet. Terra Drift is inspired by the raw, unpolished terrain you cross when the trail has no name. Crafted in a warm, natural tone that mirrors sun-baked clay and wind-swept sand dunes, this shirt is for the one who finds grounding in movement. The relaxed pocket silhouette lets you carry the essentials — a note, a memory, a seed — as you drift through landscapes that remind you why the ground matters.|Earth element. For the ones who drift through unnamed trails."
  "02-Solstice Check Camp Shirt|Solstice Check Camp Shirt|solstice-check-camp-shirt|Named after the longest day of the year — when fire meets the sky and everything glows. Solstice Check captures the warmth of golden hour in an open field, the kind of afternoon where time stretches and the sun refuses to set. The soft check pattern mirrors the geometry of sunlight filtering through woven canopies. A half-sleeve camp collar that belongs on coastlines, rooftop dinners, and anywhere the light is good.|Fire element. For golden-hour chasers and open-field wanderers."
  "03-Tidewater Stripe Shirt|Tidewater Stripe Shirt|tidewater-stripe-shirt|Water shapes everything it touches, and Tidewater Stripe carries that patience. Inspired by harbour mornings where salt air meets the rhythm of waves against old wooden docks, this shirt mirrors the quiet, repeating lines the tide leaves behind on sand. The blue-white stripe is an ode to every port town that ever made you want to stay one more day. Built for people who understand that flow is a direction, not a speed.|Water element. For harbour mornings and salt-air conversations."
  "04-Windpath Pinstripe Shirt|Windpath Pinstripe Shirt|windpath-pinstripe-shirt|You can not see the wind, but you can follow where it has been. Windpath traces the invisible lines air carves through highland valleys and open corridors between buildings. The fine pinstripe runs like a breeze — subtle, directional, and impossible to fully pin down. This is the shirt you reach for when the day could go anywhere and you want to be ready for all of it.|Air element. For breezy highland walks and open-ended days."
  "05-Earthstone Relaxed Shirt|Earthstone Relaxed Shirt|earthstone-relaxed-shirt|Named after the stones that line ancient trails — worn smooth by time, warmed by the sun, cool to the touch in the evening. Earthstone is a return to something solid. The deep, natural khaki tone carries the weight of old caravan routes and forgotten footpaths. The relaxed cut does not ask you to perform — it just lets you be. Some shirts try to make a statement. This one already made peace with the silence.|Earth element. For ancient trail walkers and quiet seekers."
  "06-Aqua Trail Check Camp Shirt|Aqua Trail Check Camp Shirt|aqua-trail-check-camp-shirt|Every river starts somewhere you did not expect. Aqua Trail follows the water from highland streams to coastal estuaries, collecting patterns along the way. The blue check carries the rhythm of ripples over shallow rock beds — natural, unhurried, and endlessly interesting up close. A half-sleeve camp shirt built for the traveller who follows rivers instead of roads.|Water element. For river followers and unexpected detours."
  "07-Ember Grid Plaid Shirt|Ember Grid Plaid Shirt|ember-grid-plaid-shirt|Embers are what remain after the fire has had its say — quieter, but still alive. Ember Grid captures the moment between flame and ash, the criss-cross pattern of charred wood still glowing underneath. This monochrome plaid holds warmth in its structure, perfect for evenings that start warm and end cool. For the traveller who knows the best conversations happen after the fire dies down.|Fire element. For late-night campfire conversations."
  "08-Fireside Heritage Plaid Shirt|Fireside Heritage Plaid Shirt|fireside-heritage-plaid-shirt|Some patterns carry history in every thread. Fireside Heritage is a burgundy plaid that feels like a story your grandfather would tell — rich, layered, and better every time you hear it. Inspired by the warmth of gathering around fire in places where tradition still means something. This is not a shirt that follows trends. It is the shirt that was here before them and will be here after.|Fire element. For storytellers and keepers of tradition."
  "09-Cloudweave Overshirt|Cloudweave Overshirt|cloudweave-overshirt|Clouds do not have a fixed shape, and neither does Cloudweave. This textured knit overshirt mimics the layered, shifting patterns of overcast skies — the kind that make you look up and wonder. The grey marl weave is irregular by design, because nature never repeats itself exactly. Heavier than a shirt, lighter than a jacket, it sits in the space between — just like the air that carries the clouds.|Air element. For sky watchers and in-between weather."
  "10-Ether Bloom Oversized Shirt|Ether Bloom Oversized Shirt|ether-bloom-oversized-shirt|Ether is the fifth element — the space where everything else exists. Bloom is what happens when you give space room to breathe. This oversized sage shirt is where emptiness becomes possibility. The generous cut does not cling or confine. It moves with you like the space between thoughts, the pause between songs, the quiet between cities. Named for the moment a seed breaks open in open air.|Ether element. Where emptiness becomes possibility."
  "11-Void Passage Pocket Shirt|Void Passage Pocket Shirt|void-passage-pocket-shirt|The void is not darkness — it is potential. Passage is the movement through it. This black minimal pocket shirt is the quietest piece in the collection, and intentionally so. It represents the spaces between destinations — the overnight trains, the 4 AM airports, the walks through sleeping cities. Sometimes the most important part of the journey is the part nobody sees.|Ether element. For overnight trains and sleeping cities."
  "12-Dustroad Glen Check Shirt|Dustroad Glen Check Shirt|dustroad-glen-check-shirt|Every great road starts as dust. Dustroad Glen Check is named after the unpaved routes that connect villages the maps forgot — where the earth is soft, the air smells like rain, and the check pattern on your shirt matches the geometry of ploughed fields seen from a hilltop. The warm brown glen check carries the weight of soil and the promise of somewhere new around the bend.|Earth element. For backroad explorers and hilltop romantics."
)

for product_data in "${PRODUCTS[@]}"; do
  IFS='|' read -r folder name slug description short_desc <<< "$product_data"

  echo "[$folder]"
  echo "  Creating product: $name"

  product_id=$(insert_product "$name" "$slug" "$description" "$short_desc")

  if [ -z "$product_id" ]; then
    echo "  ERROR: Failed to create product!"
    continue
  fi

  echo "  Product ID: $product_id"

  # Upload images
  local_dir="$ARCHIVE_DIR/$folder"
  if [ ! -d "$local_dir" ]; then
    echo "  WARNING: Folder not found: $local_dir"
    continue
  fi

  sort_order=0
  first=true
  for img in "$local_dir"/*; do
    [ -f "$img" ] || continue
    url=$(upload_image "$img" "$slug")

    is_primary=false
    if $first; then
      is_primary=true
      first=false
    fi

    insert_image "$product_id" "$url" "$sort_order" "$is_primary" "$name"
    sort_order=$((sort_order + 1))
  done

  echo "  Uploaded $sort_order images"

  # Create variants
  insert_variants "$product_id" "$name"
  echo "  Created 5 variants (S/M/L/XL/XXL)"
  echo ""
done

echo "=== Upload Complete ==="
