-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "costPrice" DECIMAL(10,2);

-- Data backfill: mirror each product's primary category into the many-to-many
-- join table so category membership is consistent everywhere (counts, catalog
-- browse, and the analytics category filter all read the join table). Idempotent.
INSERT INTO "product_categories" ("productId", "categoryId", "createdAt")
SELECT "id", "categoryId", CURRENT_TIMESTAMP
FROM "products"
ON CONFLICT ("productId", "categoryId") DO NOTHING;
