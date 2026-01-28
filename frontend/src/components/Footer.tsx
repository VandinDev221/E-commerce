import { Link } from 'react-router-dom';

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-gray-200 bg-gray-900 text-gray-300 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-4 text-xs sm:flex-row sm:px-6">
        <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500">
          <span className="font-semibold text-white dark:text-gray-100">E-commerce</span>
          <span className="hidden sm:inline-block">•</span>
          <span className="hidden sm:inline-block">
            Sua loja online de confiança. Produtos de qualidade e entrega rápida.
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 text-gray-400 dark:text-gray-500">
          <nav className="flex flex-wrap gap-3">
            <Link to="/products" className="hover:text-white dark:hover:text-gray-50">
              Produtos
            </Link>
            <Link to="/blog" className="hover:text-white dark:hover:text-gray-50">
              Blog
            </Link>
            <Link to="/cart" className="hover:text-white dark:hover:text-gray-50">
              Carrinho
            </Link>
            <Link to="/login" className="hover:text-white dark:hover:text-gray-50">
              Entrar
            </Link>
            <Link to="/register" className="hover:text-white dark:hover:text-gray-50">
              Cadastrar
            </Link>
          </nav>
          <span className="hidden sm:inline-block">•</span>
          <span className="hidden sm:inline-block">
            contato@ecommerce.com · (11) 99999-9999
          </span>
        </div>
        <div className="text-[11px] text-gray-500 dark:text-gray-600">
          © {year} E-commerce. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
}
