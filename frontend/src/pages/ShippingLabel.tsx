import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { LABEL_STORE } from '../constants';

type OrderForLabel = {
  id: string;
  orderNumber: string;
  trackingCode: string | null;
  shippingStreet: string;
  shippingCity: string;
  shippingState: string;
  shippingZip: string;
  shippingCpf?: string | null;
  shippingPhone?: string | null;
  createdAt: string;
  user?: { name: string | null; email: string } | null;
  items?: { name: string; quantity: number }[];
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

  const NOME_CLIENTE = order.user?.name || order.user?.email || 'Cliente';
  const formatCpf = (v: string | null | undefined) => {
    if (!v) return '-';
    const d = v.replace(/\D/g, '');
    if (d.length !== 11) return v;
    return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };
  const formatPhone = (v: string | null | undefined) => {
    if (!v) return '-';
    const d = v.replace(/\D/g, '');
    if (d.length === 11) return d.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    if (d.length === 10) return d.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    return v;
  };
  const CPF_CLIENTE = formatCpf(order.shippingCpf);
  const TELEFONE_CLIENTE = formatPhone(order.shippingPhone);
  const RUA = order.shippingStreet;
  const NUMERO = '-';
  const COMPLEMENTO = '-';
  const BAIRRO = '-';
  const CIDADE = order.shippingCity;
  const UF = order.shippingState;
  const CEP = (order.shippingZip || '').replace(/\D/g, '').replace(/(\d{5})(\d{3})/, '$1-$2');
  const NUMERO_PEDIDO = order.orderNumber;
  const DATA_PEDIDO = new Date(order.createdAt).toLocaleString('pt-BR');
  const QTD_ITENS = order.items?.reduce((s, i) => s + i.quantity, 0) ?? 0;
  const PESO = '-';
  const TRANSPORTADORA = '-';
  const TIPO_ENVIO = '-';
  const CODIGO_RASTREIO = order.trackingCode || '-';
  const OBSERVACOES = '-';

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

      <div id="shipping-label" className="shipping-label max-w-[10cm] rounded-lg border-2 border-gray-800 bg-white p-4 font-sans text-sm print:border-2 print:shadow-none">
        <h2 className="mb-3 border-b border-gray-400 pb-2 text-center text-base font-bold uppercase tracking-wide">
          📦 Etiqueta de envio
        </h2>

        <section className="mb-3 border-b border-gray-300 pb-2">
          <p className="text-xs font-bold uppercase text-gray-600">Dados do remetente</p>
          <p><strong>Loja:</strong> {LABEL_STORE.NOME_LOJA}</p>
          {LABEL_STORE.CNPJ_LOJA && <p><strong>CNPJ/CPF:</strong> {LABEL_STORE.CNPJ_LOJA}</p>}
          {LABEL_STORE.ENDERECO_LOJA && <p><strong>Endereço:</strong> {LABEL_STORE.ENDERECO_LOJA}</p>}
        </section>

        <section className="mb-3 border-b border-gray-300 pb-2">
          <p className="text-xs font-bold uppercase text-gray-600">Dados do destinatário</p>
          <p><strong>Cliente:</strong> {NOME_CLIENTE}</p>
          <p><strong>CPF:</strong> {CPF_CLIENTE}</p>
          <p><strong>Telefone:</strong> {TELEFONE_CLIENTE}</p>
          <p className="mt-1 font-medium">Endereço:</p>
          <p>{RUA}{NUMERO !== '-' ? `, ${NUMERO}` : ''}{COMPLEMENTO !== '-' ? ` – ${COMPLEMENTO}` : ''}</p>
          <p>{BAIRRO !== '-' ? `${BAIRRO} – ` : ''}{CIDADE} / {UF}</p>
          <p>CEP: {CEP}</p>
        </section>

        <section className="mb-3 border-b border-gray-300 pb-2">
          <p className="text-xs font-bold uppercase text-gray-600">Informações do pedido</p>
          <p><strong>Plataforma:</strong> Loja</p>
          <p><strong>Pedido:</strong> {NUMERO_PEDIDO}</p>
          <p><strong>Data:</strong> {DATA_PEDIDO}</p>
          <p><strong>Quantidade de itens:</strong> {QTD_ITENS}</p>
          <p><strong>Peso:</strong> {PESO} kg</p>
        </section>

        <section className="mb-3 border-b border-gray-300 pb-2">
          <p className="text-xs font-bold uppercase text-gray-600">Envio</p>
          <p><strong>Transportadora:</strong> {TRANSPORTADORA}</p>
          <p><strong>Modalidade:</strong> {TIPO_ENVIO}</p>
          <p><strong>Código de rastreamento:</strong></p>
          <p className="font-mono font-semibold">{CODIGO_RASTREIO}</p>
        </section>

        {OBSERVACOES !== '-' && (
          <section className="mb-2">
            <p className="text-xs font-bold uppercase text-gray-600">Observações</p>
            <p>{OBSERVACOES}</p>
          </section>
        )}
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
            font-size: 11pt;
          }
        }
      `}</style>
    </div>
  );
}
