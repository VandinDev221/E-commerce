-- AlterTable: Allow deleting products that are only in delivered/cancelled orders.
-- OrderItem keeps name, price, image for history; productId becomes null when product is deleted.
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_product_id_fkey";
ALTER TABLE "OrderItem" ALTER COLUMN "product_id" DROP NOT NULL;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
