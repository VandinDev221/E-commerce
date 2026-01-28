import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import { register as registerUser } from '../store/authSlice';
import { setAuthToken } from '../api/client';

const schema = z.object({
  name: z.string().min(1, 'Nome obrigatório').optional(),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
});

type Form = z.infer<typeof schema>;

export default function Register() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(schema) });

  const onSubmit = (data: Form) => {
    dispatch(registerUser(data))
      .unwrap()
      .then(() => {
        const token = localStorage.getItem('accessToken');
        if (token) setAuthToken(token);
        toast.success('Conta criada!');
        navigate('/');
      })
      .catch((e: Error) => toast.error(e.message));
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-2xl font-bold text-gray-900">Cadastrar</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Nome</label>
          <input {...register('name')} className="input mt-1" placeholder="Seu nome" />
          {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">E-mail</label>
          <input {...register('email')} type="email" className="input mt-1" />
          {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Senha</label>
          <input {...register('password')} type="password" className="input mt-1" />
          {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>}
        </div>
        <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
          {isSubmitting ? 'Cadastrando...' : 'Cadastrar'}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-gray-600">
        Já tem conta?{' '}
        <Link to="/login" className="text-primary-600 hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
