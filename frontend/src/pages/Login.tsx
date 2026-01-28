import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import { login } from '../store/authSlice';
import { setAuthToken } from '../api/client';

const schema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
});

type Form = z.infer<typeof schema>;

export default function Login() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(schema) });

  const onSubmit = (data: Form) => {
    dispatch(login(data))
      .unwrap()
      .then(() => {
        const token = localStorage.getItem('accessToken');
        if (token) setAuthToken(token);
        toast.success('Login realizado!');
        navigate('/');
      })
      .catch((e: Error) => toast.error(e.message));
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-2xl font-bold text-gray-900">Entrar</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
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
        <Link to="/auth/forgot-password" className="block text-sm text-primary-600 hover:underline">
          Esqueci minha senha
        </Link>
        <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
          {isSubmitting ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-gray-600">
        Não tem conta?{' '}
        <Link to="/register" className="text-primary-600 hover:underline">
          Cadastrar
        </Link>
      </p>
    </div>
  );
}
