import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  createdAt: string;
  items: Array<{ name: string; quantity: number; price: number }>;
}

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Order[]>('/orders')
      .then((res) => setOrders(res.data))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);

  const statusLabel: Record<string, string> = {
    PENDING: 'Pendente',
    PROCESSING: 'Processando',
    PAID: 'Pago',
    SHIPPED: 'Enviado',
    DELIVERED: 'Entregue',
    CANCELLED: 'Cancelado',
  };

  if (loading) return <div className="mx-auto max-w-4xl px-4 py-16 text-center">Carregando...</div>;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-gray-900">Meus pedidos</h1>
      {orders.length === 0 ? (
        <p className="mt-8 text-gray-500">Nenhum pedido ainda.</p>
      ) : (
        <ul className="mt-8 space-y-4">
          {orders.map((order) => (
            <li key={order.id} className="card overflow-hidden">
              <Link
                to={`/orders/${order.id}`}
                className="flex flex-wrap items-center justify-between gap-4 p-4 hover:bg-gray-50 sm:flex-nowrap"
              >
                <div>
                  <p className="font-medium text-gray-900">#{order.orderNumber}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-sm font-medium ${
                    order.status === 'DELIVERED'
                      ? 'bg-green-100 text-green-800'
                      : order.status === 'CANCELLED'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {statusLabel[order.status] ?? order.status}
                </span>
                <p className="font-bold text-primary-600">
                  R$ {order.total.toFixed(2).replace('.', ',')}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
