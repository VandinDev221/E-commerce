import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { api } from '../api/client';
import { useDispatch, useSelector } from 'react-redux';
import { setUser } from '../store/authSlice';
import type { RootState } from '../store';

const profileSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email(),
});

type ProfileForm = z.infer<typeof profileSchema>;

export default function Profile() {
  const { user } = useSelector((s: RootState) => s.auth);
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(true);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name ?? '', email: user?.email ?? '' },
  });

  useEffect(() => {
    api
      .get('/user/profile')
      .then((res) => {
        reset(res.data);
      })
      .catch(() => toast.error('Erro ao carregar perfil'))
      .finally(() => setLoading(false));
  }, [reset]);

  const onSubmit = (data: ProfileForm) => {
    api
      .patch('/user/profile', data)
      .then((res) => {
        dispatch(setUser(res.data));
        toast.success('Perfil atualizado');
      })
      .catch((e: Error) => toast.error(e.message));
  };

  if (loading) return <div className="mx-auto max-w-2xl px-4 py-16 text-center">Carregando...</div>;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-gray-900">Meu perfil</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="card mt-6 space-y-4 p-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">Nome</label>
          <input {...register('name')} className="input mt-1" />
          {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">E-mail</label>
          <input {...register('email')} type="email" className="input mt-1" />
          {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
        </div>
        <button type="submit" className="btn-primary">
          Salvar
        </button>
      </form>
    </div>
  );
}
