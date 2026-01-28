import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { getDefaultImageUrl } from '../constants';

interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  coverImage: string | null;
  createdAt: string;
}

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    api
      .get<Post>(`/blog/${slug}`)
      .then((res) => setPost(res.data))
      .catch(() => setPost(null))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <div className="mx-auto max-w-3xl px-4 py-16 text-center">Carregando...</div>;
  if (!post) return <div className="mx-auto max-w-3xl px-4 py-16 text-center text-gray-500">Post não encontrado.</div>;

  const coverSrc = post.coverImage || getDefaultImageUrl(post.title);

  return (
    <article className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link to="/blog" className="text-sm text-primary-600 hover:underline">
        ← Voltar ao blog
      </Link>
      <header className="mt-4">
        <time className="text-sm text-gray-500">
          {new Date(post.createdAt).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          })}
        </time>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">{post.title}</h1>
        {post.excerpt && <p className="mt-2 text-lg text-gray-600">{post.excerpt}</p>}
      </header>
      <div className="mt-6 aspect-video w-full overflow-hidden rounded-xl bg-gray-100">
        <img src={coverSrc} alt="" className="h-full w-full object-cover" />
      </div>
      <div
        className="prose prose-lg mt-8 max-w-none prose-headings:font-semibold prose-p:text-gray-700 prose-a:text-primary-600"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />
    </article>
  );
}
