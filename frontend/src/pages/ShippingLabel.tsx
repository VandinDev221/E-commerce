import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { formatAddressLine } from '../utils/address';

type OrderForLabel = {
  id: string;
  orderNumber: string;
  trackingCode: string | null;
  shippingStreet: string;
  shippingCity: string;
  shippingState: string;
  shippingZip: string;
  user?: { name: string | null; email: string } | null;
};

export default function ShippingLabel() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderForLabel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api
      .get<OrderForLabel>(`/admin/orders/${id}`)
      .then((res) => setOrder(res.data))
      .catch(() => setError('Pedido não encontrado'))
      .finally(() => setLoading(false));
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center p-8">
        <p className="text-gray-500">Carregando...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="p-8">
        <p className="text-red-600">{error ?? 'Pedido não encontrado'}</p>
        <button type="button" onClick={() => navigate('/admin/orders')} className="btn-primary mt-4">
          Voltar aos pedidos
        </button>
      </div>
    );
  }

  const recipientName = order.user?.name || order.user?.email || 'Cliente';
  const addressLine = formatAddressLine(
    order.shippingStreet,
    order.shippingCity,
    order.shippingState,
    order.shippingZip
  );

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-center gap-3 no-print">
        <button type="button" onClick={() => navigate('/admin/orders')} className="rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          Voltar
        </button>
        <button type="button" onClick={handlePrint} className="btn-primary flex items-center gap-2 px-4 py-2">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2h-2m-4-1v8m-4 0l4-4m0 0l4 4m-4-4v4" />
          </svg>
          Imprimir etiqueta
        </button>
      </div>

      <div id="shipping-label" className="shipping-label rounded-lg border-2 border-gray-800 bg-white p-6 font-sans print:border-2 print:shadow-none">
        <div className="mb-4 border-b border-gray-300 pb-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Destinatário</p>
          <p className="mt-1 text-lg font-bold text-gray-900">{recipientName}</p>
        </div>
        <div className="mb-4 border-b border-gray-300 pb-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Endereço de entrega</p>
          <p className="mt-1 text-base font-medium text-gray-900">{addressLine}</p>
        </div>
        <div className="mb-2 flex flex-wrap gap-4 text-sm">
          <span>
            <strong className="text-gray-600">Pedido:</strong> {order.orderNumber}
          </span>
          {order.trackingCode && (
            <span>
              <strong className="text-gray-600">Rastreio:</strong> {order.trackingCode}
            </span>
          )}
        </div>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .no-print, .no-print * { display: none !important; }
          #shipping-label, #shipping-label * { visibility: visible; }
          #shipping-label {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            max-width: 10cm;
            padding: 0.5cm;
            border: 2px solid #000;
            box-shadow: none;
          }
        }
      `}</style>
    </div>
  );
}
