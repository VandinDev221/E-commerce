-- Product: preço de custo e link da Shopee (margem 15%)
ALTER TABLE "Product" ADD COLUMN "cost_price" DECIMAL(10,2);
ALTER TABLE "Product" ADD COLUMN "source_url" TEXT;

-- Order: marcar quando pedido foi feito na Shopee
ALTER TABLE "Order" ADD COLUMN "shopee_order_id" TEXT;
ALTER TABLE "Order" ADD COLUMN "shopee_placed_at" TIMESTAMP(3);
