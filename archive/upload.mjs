import fs from 'fs';
import path from 'path';

const SUPABASE_URL = "https://pahlcltpwzsqdclizdtl.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhaGxjbHRwd3pzcWRjbGl6ZHRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mjc4OTc4MywiZXhwIjoyMDg4MzY1NzgzfQ.d1ule-2QQLESaILH8-fBqBN5FwoJhU4bBw8oJV8p-vY";
const CATEGORY_ID = "cmn03vqg60001xn1rpahtu82q";
const ARCHIVE_DIR = "c:/work/earth_revibe/archive";

const headers = {
  "apikey": SUPABASE_KEY,
  "Authorization": `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
};

function genId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = 'cm';
  for (let i = 0; i < 23; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

const PRODUCTS = [
  {
    folder: "01-Terra Drift Pocket Shirt",
    name: "Terra Drift Pocket Shirt",
    slug: "terra-drift-pocket-shirt",
    shortDescription: "Earth element. For the ones who drift through unnamed trails.",
    description: "Born from the earth beneath your feet. Terra Drift is inspired by the raw, unpolished terrain you cross when the trail has no name. Crafted in a warm, natural tone that mirrors sun-baked clay and wind-swept sand dunes, this shirt is for the one who finds grounding in movement. The relaxed pocket silhouette lets you carry the essentials — a note, a memory, a seed — as you drift through landscapes that remind you why the ground matters.",
  },
  {
    folder: "02-Solstice Check Camp Shirt",
    name: "Solstice Check Camp Shirt",
    slug: "solstice-check-camp-shirt",
    shortDescription: "Fire element. For golden-hour chasers and open-field wanderers.",
    description: "Named after the longest day of the year — when fire meets the sky and everything glows. Solstice Check captures the warmth of golden hour in an open field, the kind of afternoon where time stretches and the sun refuses to set. The soft check pattern mirrors the geometry of sunlight filtering through woven canopies. A half-sleeve camp collar that belongs on coastlines, rooftop dinners, and anywhere the light is good.",
  },
  {
    folder: "03-Tidewater Stripe Shirt",
    name: "Tidewater Stripe Shirt",
    slug: "tidewater-stripe-shirt",
    shortDescription: "Water element. For harbour mornings and salt-air conversations.",
    description: "Water shapes everything it touches, and Tidewater Stripe carries that patience. Inspired by harbour mornings where salt air meets the rhythm of waves against old wooden docks, this shirt mirrors the quiet, repeating lines the tide leaves behind on sand. The blue-white stripe is an ode to every port town that ever made you want to stay one more day. Built for people who understand that flow is a direction, not a speed.",
  },
  {
    folder: "04-Windpath Pinstripe Shirt",
    name: "Windpath Pinstripe Shirt",
    slug: "windpath-pinstripe-shirt",
    shortDescription: "Air element. For breezy highland walks and open-ended days.",
    description: "You cannot see the wind, but you can follow where it has been. Windpath traces the invisible lines air carves through highland valleys and open corridors between buildings. The fine pinstripe runs like a breeze — subtle, directional, and impossible to fully pin down. This is the shirt you reach for when the day could go anywhere and you want to be ready for all of it.",
  },
  {
    folder: "05-Earthstone Relaxed Shirt",
    name: "Earthstone Relaxed Shirt",
    slug: "earthstone-relaxed-shirt",
    shortDescription: "Earth element. For ancient trail walkers and quiet seekers.",
    description: "Named after the stones that line ancient trails — worn smooth by time, warmed by the sun, cool to the touch in the evening. Earthstone is a return to something solid. The deep, natural khaki tone carries the weight of old caravan routes and forgotten footpaths. The relaxed cut does not ask you to perform — it just lets you be. Some shirts try to make a statement. This one already made peace with the silence.",
  },
  {
    folder: "06-Aqua Trail Check Camp Shirt",
    name: "Aqua Trail Check Camp Shirt",
    slug: "aqua-trail-check-camp-shirt",
    shortDescription: "Water element. For river followers and unexpected detours.",
    description: "Every river starts somewhere you did not expect. Aqua Trail follows the water from highland streams to coastal estuaries, collecting patterns along the way. The blue check carries the rhythm of ripples over shallow rock beds — natural, unhurried, and endlessly interesting up close. A half-sleeve camp shirt built for the traveller who follows rivers instead of roads.",
  },
  {
    folder: "07-Ember Grid Plaid Shirt",
    name: "Ember Grid Plaid Shirt",
    slug: "ember-grid-plaid-shirt",
    shortDescription: "Fire element. For late-night campfire conversations.",
    description: "Embers are what remain after the fire has had its say — quieter, but still alive. Ember Grid captures the moment between flame and ash, the criss-cross pattern of charred wood still glowing underneath. This monochrome plaid holds warmth in its structure, perfect for evenings that start warm and end cool. For the traveller who knows the best conversations happen after the fire dies down.",
  },
  {
    folder: "08-Fireside Heritage Plaid Shirt",
    name: "Fireside Heritage Plaid Shirt",
    slug: "fireside-heritage-plaid-shirt",
    shortDescription: "Fire element. For storytellers and keepers of tradition.",
    description: "Some patterns carry history in every thread. Fireside Heritage is a burgundy plaid that feels like a story your grandfather would tell — rich, layered, and better every time you hear it. Inspired by the warmth of gathering around fire in places where tradition still means something. This is not a shirt that follows trends. It is the shirt that was here before them and will be here after.",
  },
  {
    folder: "09-Cloudweave Overshirt",
    name: "Cloudweave Overshirt",
    slug: "cloudweave-overshirt",
    shortDescription: "Air element. For sky watchers and in-between weather.",
    description: "Clouds do not have a fixed shape, and neither does Cloudweave. This textured knit overshirt mimics the layered, shifting patterns of overcast skies — the kind that make you look up and wonder. The grey marl weave is irregular by design, because nature never repeats itself exactly. Heavier than a shirt, lighter than a jacket, it sits in the space between — just like the air that carries the clouds.",
  },
  {
    folder: "10-Ether Bloom Oversized Shirt",
    name: "Ether Bloom Oversized Shirt",
    slug: "ether-bloom-oversized-shirt",
    shortDescription: "Ether element. Where emptiness becomes possibility.",
    description: "Ether is the fifth element — the space where everything else exists. Bloom is what happens when you give space room to breathe. This oversized sage shirt is where emptiness becomes possibility. The generous cut does not cling or confine. It moves with you like the space between thoughts, the pause between songs, the quiet between cities. Named for the moment a seed breaks open in open air.",
  },
  {
    folder: "11-Void Passage Pocket Shirt",
    name: "Void Passage Pocket Shirt",
    slug: "void-passage-pocket-shirt",
    shortDescription: "Ether element. For overnight trains and sleeping cities.",
    description: "The void is not darkness — it is potential. Passage is the movement through it. This black minimal pocket shirt is the quietest piece in the collection, and intentionally so. It represents the spaces between destinations — the overnight trains, the 4 AM airports, the walks through sleeping cities. Sometimes the most important part of the journey is the part nobody sees.",
  },
  {
    folder: "12-Dustroad Glen Check Shirt",
    name: "Dustroad Glen Check Shirt",
    slug: "dustroad-glen-check-shirt",
    shortDescription: "Earth element. For backroad explorers and hilltop romantics.",
    description: "Every great road starts as dust. Dustroad Glen Check is named after the unpaved routes that connect villages the maps forgot — where the earth is soft, the air smells like rain, and the check pattern on your shirt matches the geometry of ploughed fields seen from a hilltop. The warm brown glen check carries the weight of soil and the promise of somewhere new around the bend.",
  },
];

const SIZES = ["S", "M", "L", "XL", "XXL"];

async function supabasePost(endpoint, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
    method: "POST",
    headers: { ...headers, "Prefer": "return=representation" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    console.error("  ERROR:", JSON.stringify(data));
    return null;
  }
  return Array.isArray(data) ? data[0] : data;
}

async function uploadImage(filePath, storagePath) {
  const filename = path.basename(filePath);
  const ext = path.extname(filename).toLowerCase();
  const mime = ext === '.jpeg' || ext === '.jpg' ? 'image/jpeg' : 'image/png';
  const fileBuffer = fs.readFileSync(filePath);

  const res = await fetch(
    `${SUPABASE_URL}/storage/v1/object/product-images/${storagePath}/${filename}`,
    {
      method: "POST",
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type": mime,
        "x-upsert": "true",
      },
      body: fileBuffer,
    }
  );

  if (!res.ok) {
    const err = await res.text();
    console.error(`  Upload failed for ${filename}:`, err);
    return null;
  }

  return `${SUPABASE_URL}/storage/v1/object/public/product-images/${storagePath}/${filename}`;
}

async function main() {
  console.log("=== Earth Revibe — 5 Elements Collection Upload ===\n");

  for (const product of PRODUCTS) {
    console.log(`[${product.folder}]`);

    // Delete existing product with same slug (cascade deletes images + variants)
    const delRes = await fetch(`${SUPABASE_URL}/rest/v1/products?slug=eq.${product.slug}`, {
      method: "DELETE",
      headers,
    });
    if (delRes.ok) console.log(`  Cleaned up existing slug: ${product.slug}`);

    console.log(`  Creating: ${product.name}`);

    const now = new Date().toISOString();
    const productId = genId();

    const created = await supabasePost("products", {
      id: productId,
      name: product.name,
      slug: product.slug,
      description: product.description,
      shortDescription: product.shortDescription,
      price: 1449,
      compareAtPrice: 1999,
      material: "100% Cotton Linen Blend",
      careInstructions: "Machine Cold Wash, No Bleaching",
      returnsInfo: "72 Hours Hassle Free Returns and Exchange",
      shippingInfo: "Free Delivery Only on Prepaid Orders",
      origin: "Proudly Made in India",
      composition: "100% Cotton Linen Blend",
      measurements: "Relaxed Fit",
      fabricWeight: "N/A",
      fit: "Relaxed Fit Silhouette",
      washInstructions: "Machine Cold Wash, No Bleaching",
      status: "DRAFT",
      isFeatured: false,
      categoryId: CATEGORY_ID,
      updatedAt: now,
    });

    if (!created) {
      console.log("  FAILED — skipping\n");
      continue;
    }

    console.log(`  Product ID: ${created.id}`);

    // Upload images
    const dir = path.join(ARCHIVE_DIR, product.folder);
    if (!fs.existsSync(dir)) {
      console.log(`  WARNING: Folder not found — skipping images\n`);
      continue;
    }

    const files = fs.readdirSync(dir).filter(f => /\.(png|jpe?g|webp)$/i.test(f)).sort();
    let imgCount = 0;

    for (let i = 0; i < files.length; i++) {
      const filePath = path.join(dir, files[i]);
      console.log(`  Uploading ${files[i]}...`);
      const url = await uploadImage(filePath, product.slug);
      if (!url) continue;

      const imgId = genId();
      await supabasePost("product_images", {
        id: imgId,
        productId: created.id,
        url,
        publicId: "",
        altText: product.name,
        sortOrder: i,
        isPrimary: i === 0,
      });
      imgCount++;
    }

    console.log(`  ${imgCount} images uploaded`);

    // Create variants
    for (const size of SIZES) {
      const sku = `${product.slug}-${size.toLowerCase()}`;
      const varId = genId();
      await supabasePost("product_variants", {
        id: varId,
        productId: created.id,
        sku,
        size,
        color: "",
        stock: 25,
        lowStockThreshold: 5,
        isActive: true,
        updatedAt: now,
      });
    }

    console.log(`  5 variants created (S/M/L/XL/XXL)\n`);
  }

  console.log("=== Upload Complete ===");
}

main().catch(console.error);
