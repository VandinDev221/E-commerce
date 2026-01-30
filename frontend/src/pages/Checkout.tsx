import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSelector, useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import { api } from '../api/client';
import type { RootState } from '../store';
import { fetchCart } from '../store/cartSlice';

const step1Schema = z.object({
  zipCode: z.string().min(8, 'CEP inválido'),
  street: z.string().min(1, 'Obrigatório'),
  number: z.string().min(1, 'Obrigatório'),
  complement: z.string().optional(),
  neighborhood: z.string().min(1, 'Obrigatório'),
  city: z.string().min(1, 'Obrigatório'),
  state: z.string().min(1, 'Obrigatório'),
});
const step2Schema = z.object({
  paymentMethod: z.enum(['CARD', 'PIX', 'BOLETO']),
  couponCode: z.string().optional(),
});

type Step1Form = z.infer<typeof step1Schema>;
type Step2Form = z.infer<typeof step2Schema>;

export default function Checkout() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((s: RootState) => s.auth);
  const { items, subtotal } = useSelector((s: RootState) => s.cart);
  const [step, setStep] = useState(1);
  const [shippingCost, setShippingCost] = useState(15.9);
  const [discount, setDiscount] = useState(0);
  const [couponValid, setCouponValid] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    dispatch(fetchCart());
  }, [user, navigate, dispatch]);

  const {
    register: reg1,
    handleSubmit: handle1,
    setValue: setValue1,
    watch: watch1,
    formState: { errors: err1 },
  } = useForm<Step1Form>({ resolver: zodResolver(step1Schema) });

  const {
    register: reg2,
    handleSubmit: handle2,
    watch: watch2,
    formState: { errors: err2 },
  } = useForm<Step2Form>({ resolver: zodResolver(step2Schema), defaultValues: { paymentMethod: 'CARD' } });

  const zipCode = watch1('zipCode');
  useEffect(() => {
    if (!zipCode || zipCode.replace(/\D/g, '').length < 8) return;
    api
      .get(`/shipping/cep/${zipCode.replace(/\D/g, '')}`)
      .then((res) => {
        setValue1('street', res.data.logradouro || '');
        setValue1('neighborhood', res.data.bairro || '');
        setValue1('city', res.data.localidade || '');
        setValue1('state', res.data.uf || '');
      })
      .catch(() => {});
  }, [zipCode, setValue1]);

  const couponCode = watch2('couponCode');
  useEffect(() => {
    if (!couponCode?.trim()) {
      setCouponValid(null);
      setDiscount(0);
      return;
    }
    api
      .post('/coupons/validate', { code: couponCode.trim(), subtotal })
      .then((res) => {
        setCouponValid(true);
        setDiscount(res.data.discount);
      })
      .catch(() => {
        setCouponValid(false);
        setDiscount(0);
      });
  }, [couponCode, subtotal]);

  const onStep1 = (data: Step1Form) => {
    api
      .post('/shipping/calculate', { zipCode: data.zipCode.replace(/\D/g, '') })
      .then((res) => setShippingCost(res.data.options?.[0]?.price ?? 15.9))
      .catch(() => setShippingCost(15.9))
      .finally(() => setStep(2));
  };

  const total = subtotal + shippingCost - discount;

  const onStep2 = (data: Step2Form) => {
    const payload = {
      items: items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        price: i.price,
        name: i.name,
        image: i.image ?? undefined,
      })),
      shippingStreet: watch1('street'),
      shippingCity: watch1('city'),
      shippingState: watch1('state'),
      shippingZip: watch1('zipCode').replace(/\D/g, ''),
      paymentMethod: data.paymentMethod,
      couponCode: data.couponCode?.trim() || undefined,
      shippingCost,
    };
    api
      .post('/orders', payload)
      .then((res) => {
        toast.success('Pedido realizado!');
        navigate(`/orders/${res.data.id}`);
      })
      .catch((e: Error) => toast.error(e.message));
  };

  if (!user) return null;
  if (items.length === 0 && step === 1) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-gray-500">Adicione itens ao carrinho para finalizar.</p>
        <button type="button" onClick={() => navigate('/products')} className="btn-primary mt-4">
          Ver produtos
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-gray-900">Checkout</h1>
      <div className="mt-8 flex flex-col gap-8 lg:flex-row">
        {/* Resumo em cima no mobile; à direita no desktop */}
        <div className="order-1 w-full shrink-0 lg:order-2 lg:w-80">
          <div className="card sticky top-24 p-6">
            <h3 className="font-semibold text-gray-900">Resumo</h3>
            <ul className="mt-4 space-y-2 text-sm">
              {items.map((i) => (
                <li key={i.id} className="flex justify-between">
                  <span className="line-clamp-1">{i.name} x{i.quantity}</span>
                  <span>R$ {(i.price * i.quantity).toFixed(2).replace('.', ',')}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 space-y-1 border-t border-gray-200 pt-4 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>R$ {subtotal.toFixed(2).replace('.', ',')}</span>
              </div>
              <div className="flex justify-between">
                <span>Frete</span>
                <span>R$ {shippingCost.toFixed(2).replace('.', ',')}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Desconto</span>
                  <span>- R$ {discount.toFixed(2).replace('.', ',')}</span>
                </div>
              )}
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span>R$ {total.toFixed(2).replace('.', ',')}</span>
              </div>
            </div>
          </div>
        </div>
        {/* Formulário embaixo do resumo no mobile; à esquerda no desktop */}
        <div className="order-2 min-w-0 flex-1 lg:order-1">
          {step === 1 && (
            <form onSubmit={handle1(onStep1)} className="card space-y-4 p-6">
              <h2 className="text-lg font-semibold">Endereço de entrega</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700">CEP</label>
                <input {...reg1('zipCode')} className="input mt-1" placeholder="00000-000" />
                {err1.zipCode && <p className="mt-1 text-sm text-red-600">{err1.zipCode.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Rua</label>
                <input {...reg1('street')} className="input mt-1" />
                {err1.street && <p className="mt-1 text-sm text-red-600">{err1.street.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Número</label>
                  <input {...reg1('number')} className="input mt-1" />
                  {err1.number && <p className="mt-1 text-sm text-red-600">{err1.number.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Complemento</label>
                  <input {...reg1('complement')} className="input mt-1" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Bairro</label>
                <input {...reg1('neighborhood')} className="input mt-1" />
                {err1.neighborhood && <p className="mt-1 text-sm text-red-600">{err1.neighborhood.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Cidade</label>
                  <input {...reg1('city')} className="input mt-1" />
                  {err1.city && <p className="mt-1 text-sm text-red-600">{err1.city.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Estado</label>
                  <input {...reg1('state')} className="input mt-1" />
                  {err1.state && <p className="mt-1 text-sm text-red-600">{err1.state.message}</p>}
                </div>
              </div>
              <button type="submit" className="btn-primary w-full">
                Continuar
              </button>
            </form>
          )}
          {step === 2 && (
            <form onSubmit={handle2(onStep2)} className="card space-y-4 p-6">
              <h2 className="text-lg font-semibold">Pagamento</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700">Forma de pagamento</label>
                <select {...reg2('paymentMethod')} className="input mt-1">
                  <option value="CARD">Cartão</option>
                  <option value="PIX">PIX</option>
                  <option value="BOLETO">Boleto</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Cupom</label>
                <input {...reg2('couponCode')} className="input mt-1" placeholder="Código do cupom" />
                {couponValid === true && <p className="mt-1 text-sm text-green-600">Cupom aplicado!</p>}
                {couponValid === false && <p className="mt-1 text-sm text-red-600">Cupom inválido.</p>}
              </div>
              <button type="submit" className="btn-primary w-full">
                Confirmar pedido
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
