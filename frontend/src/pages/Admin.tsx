import { Outlet, Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { FiPackage, FiShoppingBag, FiUsers, FiTag, FiBarChart2, FiEdit2, FiTrash2, FiDollarSign, FiPlus, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { api } from '../api/client';
import { formatAddressLine } from '../utils/address';

const nav = [
  { to: '/admin', icon: FiBarChart2, label: 'Dashboard' },
  { to: '/admin/products', icon: FiPackage, label: 'Produtos' },
  { to: '/admin/orders', icon: FiShoppingBag, label: 'Pedidos' },
  { to: '/admin/users', icon: FiUsers, label: 'Usuários' },
  { to: '/admin/coupons', icon: FiTag, label: 'Cupons' },
];

type Stats = { totalOrders: number; totalRevenue: number; totalProducts: number; totalUsers: number };

export function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Stats>('/admin/stats')
      .then((res) => setStats(res.data))
      .catch((e: Error) => toast.error(e.message || 'Erro ao carregar métricas'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="card p-6">
        <p className="animate-pulse text-gray-500">Carregando métricas...</p>
      </div>
    );
  }

  const cards = [
    { label: 'Pedidos', value: stats?.totalOrders ?? 0, icon: FiShoppingBag, color: 'bg-blue-50 text-blue-700' },
    { label: 'Receita (R$)', value: (stats?.totalRevenue ?? 0).toFixed(2).replace('.', ','), icon: FiDollarSign, color: 'bg-green-50 text-green-700' },
    { label: 'Produtos', value: stats?.totalProducts ?? 0, icon: FiPackage, color: 'bg-amber-50 text-amber-700' },
    { label: 'Usuários', value: stats?.totalUsers ?? 0, icon: FiUsers, color: 'bg-purple-50 text-purple-700' },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map(({ label, value, icon: Icon, color }) => (
        <div key={label} className="card p-6">
          <div className={`inline-flex rounded-lg p-2 ${color}`}>
            <Icon className="h-6 w-6" />
          </div>
          <p className="mt-3 text-sm font-medium text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      ))}
    </div>
  );
}

type AdminProduct = {
  id: string;
  name: string;
  slug: string;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  sku: string | null;
  featured: boolean;
  published: boolean;
  category?: { name: string; slug: string } | null;
};

export function AdminProducts() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const navigate = useNavigate();

  const load = () => {
    setLoading(true);
    api
      .get<AdminProduct[]>('/admin/products')
      .then((res) => setProducts(res.data))
      .catch((e: Error) => {
        console.error(e);
        toast.error(e.message || 'Erro ao carregar produtos do admin');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const deleteProduct = (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este produto?')) return;
    setDeletingId(id);
    api
      .delete(`/admin/products/${id}`)
      .then(() => {
        toast.success('Produto removido');
        setProducts((prev) => prev.filter((p) => p.id !== id));
      })
      .catch((e: Error) => toast.error(e.message))
      .finally(() => setDeletingId(null));
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-gray-900">Produtos</h2>
        <button
          type="button"
          onClick={() => navigate('/admin/products/new')}
          className="btn-primary"
        >
          Novo produto
        </button>
      </div>

      {loading ? (
        <div className="card p-4">
          <p className="animate-pulse text-gray-500">Carregando produtos...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="card p-4">
          <p className="text-gray-500">Nenhum produto cadastrado ainda.</p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-semibold text-gray-700">Nome</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-700">Preço</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-700">Estoque</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-700">Categoria</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-700">Status</th>
                <th className="px-4 py-2 text-right font-semibold text-gray-700">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {products.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-2">
                    <div className="font-medium text-gray-900">{p.name}</div>
                    <div className="text-xs text-gray-500">{p.slug}</div>
                  </td>
                  <td className="px-4 py-2">
                    R$ {p.price.toFixed(2).replace('.', ',')}
                    {p.compareAtPrice && (
                      <span className="ml-1 text-xs text-gray-400 line-through">
                        R$ {p.compareAtPrice.toFixed(2).replace('.', ',')}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2">{p.stock}</td>
                  <td className="px-4 py-2">
                    {p.category ? (
                      <span className="text-sm text-gray-700">{p.category.name}</span>
                    ) : (
                      <span className="text-xs text-gray-400">Sem categoria</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex flex-col gap-1">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          p.published
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {p.published ? 'Publicado' : 'Rascunho'}
                      </span>
                      {p.featured && (
                        <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                          Destaque
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => navigate(`/admin/products/${p.id}`)}
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                      >
                        <FiEdit2 className="h-4 w-4" />
                        Editar
                      </button>
                      <button
                        type="button"
                        disabled={deletingId === p.id}
                        onClick={() => deleteProduct(p.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        <FiTrash2 className="h-4 w-4" />
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

type ProductFormValues = {
  name: string;
  slug: string;
  description: string;
  price: string;
  compareAtPrice: string;
  stock: string;
  sku: string;
  categoryId: string;
  featured: boolean;
  published: boolean;
  images: string;
};

export function AdminProductForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEdit);
  const [imagePreviewIndex, setImagePreviewIndex] = useState(0);
  const [values, setValues] = useState<ProductFormValues>({
    name: '',
    slug: '',
    description: '',
    price: '',
    compareAtPrice: '',
    stock: '0',
    sku: '',
    categoryId: '',
    featured: false,
    published: true,
    images: '',
  });

  useEffect(() => {
    if (!isEdit) return;
    api
      .get(`/admin/products/${id}`)
      .then((res) => {
        const p = res.data;
        setValues({
          name: p.name ?? '',
          slug: p.slug ?? '',
          description: p.description ?? '',
          price: String(p.price ?? ''),
          compareAtPrice: p.compareAtPrice ? String(p.compareAtPrice) : '',
          stock: String(p.stock ?? '0'),
          sku: p.sku ?? '',
          categoryId: p.categoryId ?? '',
          featured: Boolean(p.featured),
          published: Boolean(p.published),
          images: Array.isArray(p.images) ? p.images.join('\n') : '',
        });
      })
      .catch((e: Error) => {
        console.error(e);
        toast.error('Erro ao carregar produto');
        navigate('/admin/products');
      })
      .finally(() => setInitialLoading(false));
  }, [id, isEdit, navigate]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type, checked } = e.target as HTMLInputElement;
    setValues((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const imageUrls = values.images
        .trim()
        .split(/\n/)
        .map((s) => s.trim())
        .filter(Boolean);
      const payload = {
        name: values.name,
        slug: values.slug || undefined,
        description: values.description || undefined,
        price: Number(values.price),
        compareAtPrice: values.compareAtPrice ? Number(values.compareAtPrice) : undefined,
        stock: Number(values.stock),
        sku: values.sku || undefined,
        categoryId: values.categoryId || undefined,
        featured: values.featured,
        published: values.published,
        ...(imageUrls.length > 0 && { images: imageUrls }),
      };

      const formData = new FormData();
      formData.append('data', JSON.stringify(payload));

      if (isEdit) {
        await api.put(`/admin/products/${id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Produto atualizado');
      } else {
        await api.post('/admin/products', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Produto criado');
      }
      navigate('/admin/products');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="card p-4">
        <p className="animate-pulse text-gray-500">Carregando produto...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <button
        type="button"
        onClick={() => navigate('/admin/products')}
        className="mb-4 text-sm text-gray-600 hover:text-primary-600"
      >
        ← Voltar para lista
      </button>
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900">
          {isEdit ? 'Editar produto' : 'Novo produto'}
        </h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nome</label>
            <input
              name="name"
              value={values.name}
              onChange={handleChange}
              className="input mt-1"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Slug</label>
            <input
              name="slug"
              value={values.slug}
              onChange={handleChange}
              className="input mt-1"
              placeholder="opcional (gerado automaticamente se vazio)"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Descrição</label>
            <textarea
              name="description"
              value={values.description}
              onChange={handleChange}
              className="input mt-1 min-h-[80px]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">URL(s) da imagem</label>
            <textarea
              name="images"
              value={values.images}
              onChange={handleChange}
              className="input mt-1 min-h-[72px] font-mono text-sm"
              placeholder="Ex: https://placehold.co/600x600?text=Jaqueta+Jeans — uma URL por linha"
            />
            <p className="mt-1 text-xs text-gray-500">
              Cole o link da imagem. Para várias imagens, use uma URL por linha.
            </p>
            {values.images.trim() && (() => {
              const urls = values.images
                .trim()
                .split(/\n/)
                .map((s) => s.trim())
                .filter(Boolean);
              const safeIndex = Math.min(imagePreviewIndex, Math.max(0, urls.length - 1));
              const currentUrl = urls[safeIndex];
              const hasMultiple = urls.length > 1;
              return (
                <div className="mt-3">
                  <div className="relative flex aspect-square max-h-48 w-full max-w-xs items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                    {currentUrl && (
                      <img
                        src={currentUrl}
                        alt=""
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://placehold.co/600x600?text=Erro';
                        }}
                      />
                    )}
                    {hasMultiple && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            setImagePreviewIndex((i) => (i === 0 ? urls.length - 1 : i - 1))
                          }
                          className="absolute left-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-gray-700 shadow hover:bg-white"
                        >
                          <FiChevronLeft className="h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setImagePreviewIndex((i) => (i === urls.length - 1 ? 0 : i + 1))
                          }
                          className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-gray-700 shadow hover:bg-white"
                        >
                          <FiChevronRight className="h-5 w-5" />
                        </button>
                        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
                          {urls.map((_, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setImagePreviewIndex(i)}
                              className={`h-1.5 w-1.5 rounded-full ${
                                i === safeIndex ? 'bg-primary-600' : 'bg-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {urls.length} imagem(ns) — {hasMultiple ? 'use as setas para navegar' : ''}
                  </p>
                </div>
              );
            })()}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Preço</label>
              <input
                name="price"
                type="number"
                min="0"
                step="0.01"
                value={values.price}
                onChange={handleChange}
                className="input mt-1"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Preço de comparação (opcional)
              </label>
              <input
                name="compareAtPrice"
                type="number"
                min="0"
                step="0.01"
                value={values.compareAtPrice}
                onChange={handleChange}
                className="input mt-1"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Estoque</label>
              <input
                name="stock"
                type="number"
                min="0"
                value={values.stock}
                onChange={handleChange}
                className="input mt-1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">SKU</label>
              <input
                name="sku"
                value={values.sku}
                onChange={handleChange}
                className="input mt-1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Categoria (ID)</label>
              <input
                name="categoryId"
                value={values.categoryId}
                onChange={handleChange}
                className="input mt-1"
                placeholder="opcional"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                name="published"
                checked={values.published}
                onChange={handleChange}
              />
              Publicado
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                name="featured"
                checked={values.featured}
                onChange={handleChange}
              />
              Destaque
            </label>
          </div>
          <button type="submit" disabled={loading} className="btn-primary mt-2">
            {loading ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Criar produto'}
          </button>
        </form>
      </div>
    </div>
  );
}

const ORDER_STATUSES = ['PENDING', 'PROCESSING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'] as const;
const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendente',
  PROCESSING: 'Em processamento',
  PAID: 'Pago',
  SHIPPED: 'Enviado',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelado',
};

type AdminOrderItem = { id: string; name: string; price: number; quantity: number };
type AdminOrder = {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  createdAt: string;
  items: AdminOrderItem[];
  shippingStreet?: string;
  shippingCity?: string;
  shippingState?: string;
  shippingZip?: string;
};

export function AdminOrders() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    api
      .get<AdminOrder[]>('/admin/orders')
      .then((res) => setOrders(res.data))
      .catch((e: Error) => toast.error(e.message || 'Erro ao carregar pedidos'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const updateStatus = (orderId: string, status: string) => {
    setUpdatingId(orderId);
    api
      .patch(`/admin/orders/${orderId}/status`, { status })
      .then(() => {
        toast.success('Status atualizado');
        setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));
      })
      .catch((e: Error) => toast.error(e.message))
      .finally(() => setUpdatingId(null));
  };

  const formatDate = (s: string) => new Date(s).toLocaleString('pt-BR');

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold text-gray-900">Pedidos</h2>
      {loading ? (
        <div className="card p-4">
          <p className="animate-pulse text-gray-500">Carregando pedidos...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="card p-4">
          <p className="text-gray-500">Nenhum pedido encontrado.</p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-semibold text-gray-700">Nº</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-700">Data</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-700">Status</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-700">Total</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-700">Entrega</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-700">Itens</th>
                <th className="px-4 py-2 text-right font-semibold text-gray-700">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="px-4 py-2 font-medium text-gray-900">{o.orderNumber}</td>
                  <td className="px-4 py-2 text-gray-600">{formatDate(o.createdAt)}</td>
                  <td className="px-4 py-2">
                    <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                      {ORDER_STATUS_LABELS[o.status] ?? o.status}
                    </span>
                  </td>
                  <td className="px-4 py-2">R$ {Number(o.total).toFixed(2).replace('.', ',')}</td>
                  <td className="max-w-[180px] px-4 py-2 text-xs text-gray-600">
                    {o.shippingStreet || o.shippingZip
                      ? formatAddressLine(o.shippingStreet ?? '', o.shippingCity ?? '', o.shippingState ?? '', o.shippingZip ?? '')
                      : '-'}
                  </td>
                  <td className="px-4 py-2">
                    {o.items?.length
                      ? o.items.map((i) => `${i.name} (${i.quantity}x)`).join(', ')
                      : '-'}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <select
                      value={o.status}
                      disabled={updatingId === o.id}
                      onChange={(e) => updateStatus(o.id, e.target.value)}
                      className="rounded border border-gray-300 px-2 py-1 text-xs disabled:opacity-50"
                    >
                      {ORDER_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {ORDER_STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

type AdminUser = { id: string; email: string; name: string | null; role: string; createdAt: string };

export function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'USER' as 'USER' | 'ADMIN',
  });

  const load = () => {
    setLoading(true);
    api
      .get<AdminUser[]>('/admin/users')
      .then((res) => setUsers(res.data))
      .catch((e: Error) => toast.error(e.message || 'Erro ao carregar usuários'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    api
      .post<AdminUser>('/admin/users', {
        name: form.name || undefined,
        email: form.email,
        password: form.password,
        role: form.role,
      })
      .then((res) => {
        toast.success('Usuário criado');
        setUsers((prev) => [res.data, ...prev]);
        setForm({ name: '', email: '', password: '', role: 'USER' });
        setShowForm(false);
      })
      .catch((e: Error) => toast.error(e.message))
      .finally(() => setSaving(false));
  };

  const updateRole = (userId: string, role: 'USER' | 'ADMIN') => {
    setUpdatingId(userId);
    api
      .patch(`/admin/users/${userId}/role`, { role })
      .then(() => {
        toast.success('Perfil atualizado');
        setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));
      })
      .catch((e: Error) => toast.error(e.message))
      .finally(() => setUpdatingId(null));
  };

  const formatDate = (s: string) => new Date(s).toLocaleString('pt-BR');

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-gray-900">Usuários</h2>
        <button
          type="button"
          className="btn-primary"
          onClick={() => setShowForm((v) => !v)}
        >
          {showForm ? 'Cancelar' : 'Novo usuário'}
        </button>
      </div>

      {showForm && (
        <div className="card mb-4 p-6">
          <h3 className="text-lg font-medium text-gray-900">Criar usuário</h3>
          <form onSubmit={handleCreate} className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Nome</label>
              <input
                name="name"
                value={form.name}
                onChange={handleFormChange}
                className="input mt-1"
                placeholder="Opcional"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">E-mail</label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleFormChange}
                className="input mt-1"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Senha</label>
              <input
                name="password"
                type="password"
                value={form.password}
                onChange={handleFormChange}
                className="input mt-1"
                required
                minLength={6}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Perfil</label>
              <select
                name="role"
                value={form.role}
                onChange={handleFormChange}
                className="input mt-1"
              >
                <option value="USER">Usuário</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? 'Salvando...' : 'Criar usuário'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="card p-4">
          <p className="animate-pulse text-gray-500">Carregando usuários...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="card p-4">
          <p className="text-gray-500">Nenhum usuário encontrado.</p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-semibold text-gray-700">Nome</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-700">E-mail</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-700">Perfil</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-700">Cadastro</th>
                <th className="px-4 py-2 text-right font-semibold text-gray-700">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-2 font-medium text-gray-900">{u.name ?? '-'}</td>
                  <td className="px-4 py-2 text-gray-600">{u.email}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        u.role === 'ADMIN' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {u.role === 'ADMIN' ? 'Admin' : 'Usuário'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-gray-500">{formatDate(u.createdAt)}</td>
                  <td className="px-4 py-2 text-right">
                    <select
                      value={u.role}
                      disabled={updatingId === u.id}
                      onChange={(e) => updateRole(u.id, e.target.value as 'USER' | 'ADMIN')}
                      className="rounded border border-gray-300 px-2 py-1 text-xs disabled:opacity-50"
                    >
                      <option value="USER">Usuário</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

type AdminCoupon = {
  id: string;
  code: string;
  type: string;
  value: number;
  minPurchase: number | null;
  maxUses: number | null;
  usedCount: number;
  startsAt: string;
  endsAt: string;
  active: boolean;
};

export function AdminCoupons() {
  const [coupons, setCoupons] = useState<AdminCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    code: '',
    type: 'PERCENTAGE' as 'PERCENTAGE' | 'FIXED',
    value: '',
    minPurchase: '',
    maxUses: '',
    startsAt: '',
    endsAt: '',
  });

  const load = () => {
    setLoading(true);
    api
      .get<AdminCoupon[]>('/admin/coupons')
      .then((res) => setCoupons(res.data))
      .catch((e: Error) => toast.error(e.message || 'Erro ao carregar cupons'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const startsAt = form.startsAt ? new Date(form.startsAt).toISOString() : new Date().toISOString();
    const endsAt = form.endsAt ? new Date(form.endsAt).toISOString() : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    setSaving(true);
    api
      .post('/admin/coupons', {
        code: form.code.trim(),
        type: form.type,
        value: Number(form.value) || 0,
        minPurchase: form.minPurchase ? Number(form.minPurchase) : undefined,
        maxUses: form.maxUses ? Number(form.maxUses) : undefined,
        startsAt,
        endsAt,
      })
      .then(() => {
        toast.success('Cupom criado');
        setForm({ code: '', type: 'PERCENTAGE', value: '', minPurchase: '', maxUses: '', startsAt: '', endsAt: '' });
        setShowForm(false);
        load();
      })
      .catch((e: Error) => toast.error(e.message))
      .finally(() => setSaving(false));
  };

  const formatDate = (s: string) => new Date(s).toLocaleString('pt-BR');

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-gray-900">Cupons</h2>
        <button type="button" onClick={() => setShowForm((v) => !v)} className="btn-primary inline-flex items-center gap-2">
          <FiPlus className="h-4 w-4" />
          {showForm ? 'Cancelar' : 'Novo cupom'}
        </button>
      </div>

      {showForm && (
        <div className="card mb-4 p-6">
          <h3 className="text-lg font-medium text-gray-900">Novo cupom</h3>
          <form onSubmit={handleSubmit} className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Código</label>
              <input
                name="code"
                value={form.code}
                onChange={handleChange}
                className="input mt-1"
                placeholder="EX: PROMO10"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Tipo</label>
              <select name="type" value={form.type} onChange={handleChange} className="input mt-1">
                <option value="PERCENTAGE">Percentual</option>
                <option value="FIXED">Valor fixo</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Valor (%) ou R$</label>
              <input
                name="value"
                type="number"
                min="0"
                step="0.01"
                value={form.value}
                onChange={handleChange}
                className="input mt-1"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Compra mínima (R$) – opcional</label>
              <input
                name="minPurchase"
                type="number"
                min="0"
                step="0.01"
                value={form.minPurchase}
                onChange={handleChange}
                className="input mt-1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Máx. usos – opcional</label>
              <input
                name="maxUses"
                type="number"
                min="0"
                value={form.maxUses}
                onChange={handleChange}
                className="input mt-1"
              />
            </div>
            <div className="sm:col-span-2 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">Início (data/hora)</label>
                <input
                  name="startsAt"
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={handleChange}
                  className="input mt-1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Fim (data/hora)</label>
                <input name="endsAt" type="datetime-local" value={form.endsAt} onChange={handleChange} className="input mt-1" />
              </div>
            </div>
            <div className="sm:col-span-2">
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? 'Salvando...' : 'Criar cupom'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="card p-4">
          <p className="animate-pulse text-gray-500">Carregando cupons...</p>
        </div>
      ) : coupons.length === 0 ? (
        <div className="card p-4">
          <p className="text-gray-500">Nenhum cupom cadastrado.</p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-semibold text-gray-700">Código</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-700">Tipo</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-700">Valor</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-700">Compra mín.</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-700">Usos</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-700">Válido</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {coupons.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-2 font-medium text-gray-900">{c.code}</td>
                  <td className="px-4 py-2">{c.type === 'PERCENTAGE' ? 'Percentual' : 'Fixo'}</td>
                  <td className="px-4 py-2">
                    {c.type === 'PERCENTAGE' ? `${Number(c.value)}%` : `R$ ${Number(c.value).toFixed(2).replace('.', ',')}`}
                  </td>
                  <td className="px-4 py-2">
                    {c.minPurchase != null ? `R$ ${Number(c.minPurchase).toFixed(2).replace('.', ',')}` : '-'}
                  </td>
                  <td className="px-4 py-2">
                    {c.maxUses != null ? `${c.usedCount} / ${c.maxUses}` : c.usedCount}
                  </td>
                  <td className="px-4 py-2 text-gray-500">
                    {formatDate(c.startsAt)} até {formatDate(c.endsAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function Admin() {
  const location = useLocation();
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-gray-900">Painel administrativo</h1>
      <nav className="mt-6 flex flex-wrap gap-2">
        {nav.map(({ to, icon: Icon, label }) => (
          <Link
            key={to}
            to={to}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 ${
              location.pathname === to ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Icon className="h-5 w-5" />
            {label}
          </Link>
        ))}
      </nav>
      <div className="mt-8">
        <Outlet />
      </div>
    </div>
  );
}
