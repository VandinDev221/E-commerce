import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { getDefaultImageUrl } from '../constants';
import { fetchCart, updateCartItem, removeFromCart } from '../store/cartSlice';
import type { RootState } from '../store';
import type { CartItem } from '../store/cartSlice';

export default function Cart() {
  const dispatch = useDispatch();
  const { items, subtotal, loading } = useSelector((s: RootState) => s.cart);

  useEffect(() => {
    dispatch(fetchCart());
  }, [dispatch]);

  const updateQty = (item: CartItem, delta: number) => {
    const qty = Math.max(0, Math.min(item.stock, item.quantity + delta));
    if (qty === 0) dispatch(removeFromCart(item.id));
    else dispatch(updateCartItem({ itemId: item.id, quantity: qty }));
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <p className="text-gray-500">Carregando carrinho...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h2 className="text-2xl font-bold text-gray-900">Carrinho vazio</h2>
        <p className="mt-2 text-gray-600">Adicione produtos para continuar.</p>
        <Link to="/products" className="btn-primary mt-6 inline-block">
          Ver produtos
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-gray-900">Carrinho</h1>
      <div className="mt-8 space-y-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center"
          >
            <img
              src={item.image || getDefaultImageUrl(item.name)}
              alt={item.name}
              className="h-24 w-24 rounded-lg object-cover"
            />
            <div className="flex-1">
              <Link to={`/products/${item.slug}`} className="font-medium text-gray-900 hover:underline">
                {item.name}
              </Link>
              <p className="text-primary-600">
                R$ {item.price.toFixed(2).replace('.', ',')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => updateQty(item, -1)}
                className="rounded-lg border border-gray-300 px-2 py-1 hover:bg-gray-50"
              >
                −
              </button>
              <span className="w-8 text-center">{item.quantity}</span>
              <button
                type="button"
                onClick={() => updateQty(item, 1)}
                disabled={item.quantity >= item.stock}
                className="rounded-lg border border-gray-300 px-2 py-1 hover:bg-gray-50 disabled:opacity-50"
              >
                +
              </button>
            </div>
            <p className="font-medium">
              R$ {(item.price * item.quantity).toFixed(2).replace('.', ',')}
            </p>
            <button
              type="button"
              onClick={() => dispatch(removeFromCart(item.id))}
              className="text-red-600 hover:underline"
            >
              Remover
            </button>
          </div>
        ))}
      </div>
      <div className="mt-8 flex justify-end border-t border-gray-200 pt-8">
        <div className="w-full sm:w-64">
          <p className="flex justify-between text-lg font-bold">
            <span>Subtotal</span>
            <span>R$ {subtotal.toFixed(2).replace('.', ',')}</span>
          </p>
          <Link to="/checkout" className="btn-primary mt-4 block w-full text-center">
            Finalizar compra
          </Link>
        </div>
      </div>
    </div>
  );
}
