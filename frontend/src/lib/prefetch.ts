import { api } from '../api/client';

export const preloadProductsPage = () => import('../pages/Products');
export const preloadProductDetailPage = () => import('../pages/ProductDetail');
export const preloadCartPage = () => import('../pages/Cart');
export const preloadCheckoutPage = () => import('../pages/Checkout');
export const preloadBlogPage = () => import('../pages/Blog');

export function warmProductsData() {
  api.get('/products?limit=12&page=1').catch(() => undefined);
}

export function warmCommonRouteChunks() {
  preloadProductsPage();
  preloadProductDetailPage();
  preloadCartPage();
  preloadCheckoutPage();
  preloadBlogPage();
}

export function warmCommonApiData() {
  warmProductsData();
  api.get('/products/featured').catch(() => undefined);
}
