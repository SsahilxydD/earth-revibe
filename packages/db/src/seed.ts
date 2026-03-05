import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  await prisma.$transaction(async (tx) => {
    // ==========================================
    // 1. Super Admin User
    // ==========================================
    const passwordHash = await bcrypt.hash("Admin@123456", 12);

    const admin = await tx.user.upsert({
      where: { email: "admin@earthrevibe.com" },
      update: {},
      create: {
        email: "admin@earthrevibe.com",
        passwordHash,
        firstName: "Super",
        lastName: "Admin",
        role: "SUPER_ADMIN",
        emailVerified: true,
        referralCode: "ADMIN_REF",
      },
    });

    console.log(`  Created admin user: ${admin.email}`);

    // ==========================================
    // 2. Categories
    // ==========================================
    const topsCategory = await tx.category.upsert({
      where: { slug: "tops-basics" },
      update: {},
      create: {
        name: "Tops & Basics",
        slug: "tops-basics",
        description: "Sustainable tops, tees, and basic essentials made from organic and recycled materials.",
        sortOrder: 1,
        isActive: true,
      },
    });

    const bottomsCategory = await tx.category.upsert({
      where: { slug: "bottoms-pants" },
      update: {},
      create: {
        name: "Bottoms & Pants",
        slug: "bottoms-pants",
        description: "Eco-friendly bottoms, pants, and jeans crafted from sustainable fabrics.",
        sortOrder: 2,
        isActive: true,
      },
    });

    const outerwearCategory = await tx.category.upsert({
      where: { slug: "outerwear-jackets" },
      update: {},
      create: {
        name: "Outerwear & Jackets",
        slug: "outerwear-jackets",
        description: "Warm and stylish outerwear made with planet-friendly materials.",
        sortOrder: 3,
        isActive: true,
      },
    });

    console.log("  Created 3 categories");

    // ==========================================
    // 3. Products with Variants
    // ==========================================
    const sizes = ["M", "L", "XL"];
    const colors = [
      { name: "Forest Green", hex: "#228B22" },
      { name: "Sand", hex: "#C2B280" },
    ];

    const productsData = [
      // Tops
      {
        name: "Organic Cotton Tee",
        slug: "organic-cotton-tee",
        description: "A classic crew-neck tee made from 100% GOTS-certified organic cotton. Soft, breathable, and gentle on the planet. Features a relaxed fit that is perfect for everyday wear.",
        shortDescription: "Classic organic cotton crew-neck tee",
        price: 2499,
        compareAtPrice: 2999,
        material: "100% Organic Cotton",
        careInstructions: "Machine wash cold with like colours. Tumble dry low. Do not bleach.",
        categoryId: topsCategory.id,
        isFeatured: true,
      },
      {
        name: "Linen Blend Shirt",
        slug: "linen-blend-shirt",
        description: "A lightweight button-down shirt crafted from a blend of organic linen and cotton. Perfect for warm weather with a relaxed, effortless look. Naturally breathable and temperature-regulating.",
        shortDescription: "Lightweight organic linen-cotton blend shirt",
        price: 3999,
        compareAtPrice: 4799,
        material: "60% Organic Linen, 40% Organic Cotton",
        careInstructions: "Hand wash or machine wash on delicate cycle. Hang dry. Iron on medium heat.",
        categoryId: topsCategory.id,
        isFeatured: false,
      },
      // Bottoms
      {
        name: "Hemp Cargo Pants",
        slug: "hemp-cargo-pants",
        description: "Durable and versatile cargo pants made from a hemp-organic cotton blend. Features multiple utility pockets and a comfortable tapered fit. Hemp naturally requires less water and no pesticides to grow.",
        shortDescription: "Durable hemp-cotton blend cargo pants",
        price: 4499,
        compareAtPrice: 5499,
        material: "55% Hemp, 45% Organic Cotton",
        careInstructions: "Machine wash cold. Tumble dry low. Becomes softer with each wash.",
        categoryId: bottomsCategory.id,
        isFeatured: true,
      },
      {
        name: "Recycled Denim Jeans",
        slug: "recycled-denim-jeans",
        description: "Stylish straight-fit jeans crafted from recycled denim and organic cotton. Each pair diverts textile waste from landfills while delivering the classic denim look and feel you love.",
        shortDescription: "Sustainable jeans from recycled denim",
        price: 5499,
        compareAtPrice: 6499,
        material: "70% Recycled Denim, 30% Organic Cotton",
        careInstructions: "Wash sparingly. Machine wash cold inside out. Hang dry to preserve colour.",
        categoryId: bottomsCategory.id,
        isFeatured: false,
      },
      // Outerwear
      {
        name: "Organic Wool Jacket",
        slug: "organic-wool-jacket",
        description: "A premium jacket made from certified organic wool sourced from ethically raised sheep. Features a tailored silhouette with warm insulation perfect for cool weather. Naturally water-resistant and breathable.",
        shortDescription: "Premium ethically-sourced organic wool jacket",
        price: 8999,
        compareAtPrice: 10999,
        material: "100% Certified Organic Wool",
        careInstructions: "Dry clean only. Store in a breathable garment bag. Brush gently to remove surface dust.",
        categoryId: outerwearCategory.id,
        isFeatured: true,
      },
      {
        name: "Recycled Fleece Hoodie",
        slug: "recycled-fleece-hoodie",
        description: "A cozy hoodie made from recycled polyester fleece, sourced from post-consumer plastic bottles. Features a kangaroo pocket, adjustable drawstring hood, and ribbed cuffs. Warm, soft, and planet-friendly.",
        shortDescription: "Cozy hoodie from recycled plastic bottles",
        price: 5999,
        compareAtPrice: 7499,
        material: "100% Recycled Polyester Fleece",
        careInstructions: "Machine wash cold with a microfibre-catching bag. Tumble dry low. Do not iron.",
        categoryId: outerwearCategory.id,
        isFeatured: true,
      },
    ];

    for (const productData of productsData) {
      const product = await tx.product.upsert({
        where: { slug: productData.slug },
        update: {},
        create: {
          name: productData.name,
          slug: productData.slug,
          description: productData.description,
          shortDescription: productData.shortDescription,
          price: productData.price,
          compareAtPrice: productData.compareAtPrice,
          material: productData.material,
          careInstructions: productData.careInstructions,
          status: "ACTIVE",
          isFeatured: productData.isFeatured,
          categoryId: productData.categoryId,
        },
      });

      // Create variants: 3 sizes x 2 colours = 6 variants per product
      const skuPrefix = productData.slug
        .split("-")
        .map((w) => w[0]?.toUpperCase())
        .join("");

      for (const size of sizes) {
        for (const color of colors) {
          const colorCode = color.name === "Forest Green" ? "FG" : "SD";
          const sku = `${skuPrefix}-${size}-${colorCode}`;

          await tx.productVariant.upsert({
            where: { sku },
            update: {},
            create: {
              productId: product.id,
              sku,
              size,
              color: color.name,
              colorHex: color.hex,
              stock: 20,
              lowStockThreshold: 5,
              isActive: true,
            },
          });
        }
      }

      // Create a primary product image placeholder
      await tx.productImage.create({
        data: {
          productId: product.id,
          url: `https://placehold.co/800x1000?text=${encodeURIComponent(productData.name)}`,
          publicId: `products/${productData.slug}-primary`,
          altText: productData.name,
          sortOrder: 0,
          isPrimary: true,
        },
      });

      console.log(`  Created product: ${product.name} with 6 variants`);
    }

    // ==========================================
    // 4. Store Settings
    // ==========================================
    await tx.storeSettings.upsert({
      where: { id: "default-store-settings" },
      update: {},
      create: {
        id: "default-store-settings",
        storeName: "Earth Revibe",
        contactEmail: "hello@earthrevibe.com",
        contactPhone: "+91-9876543210",
        socialInstagram: "https://instagram.com/earthrevibe",
        socialFacebook: "https://facebook.com/earthrevibe",
        socialTwitter: "https://twitter.com/earthrevibe",
        freeShippingThreshold: 1499,
        gstRate: 18,
        returnWindowDays: 7,
      },
    });

    console.log("  Created store settings");

    // ==========================================
    // 5. Loyalty Config
    // ==========================================
    await tx.loyaltyConfig.upsert({
      where: { id: "default-loyalty-config" },
      update: {},
      create: {
        id: "default-loyalty-config",
        pointsPerRupee: 0.1,
        pointRedemptionValue: 0.1,
        welcomeBonus: 50,
        reviewBonus: 25,
        birthdayBonus: 100,
        minRedeemPoints: 100,
        isActive: true,
      },
    });

    console.log("  Created loyalty config");

    // ==========================================
    // 6. Referral Config
    // ==========================================
    await tx.referralConfig.upsert({
      where: { id: "default-referral-config" },
      update: {},
      create: {
        id: "default-referral-config",
        referrerReward: 100,
        refereeReward: 50,
        requirePurchase: true,
        isActive: true,
      },
    });

    console.log("  Created referral config");

    // ==========================================
    // 7. Shipping Zones
    // ==========================================
    const shippingZones = [
      {
        name: "Metro Cities",
        states: ["Delhi", "Maharashtra", "Karnataka", "Tamil Nadu", "Telangana", "West Bengal"],
        rate: 0,
        minDays: 2,
        maxDays: 4,
        isActive: true,
      },
      {
        name: "Rest of India",
        states: [],
        rate: 99,
        minDays: 4,
        maxDays: 7,
        isActive: true,
      },
    ];

    for (const zone of shippingZones) {
      await tx.shippingZone.create({
        data: zone,
      });
    }

    console.log("  Created shipping zones");
  });

  console.log("Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error("Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
