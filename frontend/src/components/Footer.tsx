import { Link } from 'react-router-dom';

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-gray-800 bg-gray-950 text-gray-300">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-lg font-semibold text-white">E-commerce</p>
            <p className="mt-2 text-sm text-gray-400">
              Plataforma de compras com catálogo atualizado, pagamento seguro e entrega eficiente.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-gray-200">Navegação</p>
            <nav className="mt-3 flex flex-col gap-2 text-sm text-gray-400">
              <Link to="/products" className="hover:text-white">
                Produtos
              </Link>
              <Link to="/blog" className="hover:text-white">
                Blog
              </Link>
              <Link to="/cart" className="hover:text-white">
                Carrinho
              </Link>
            </nav>
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-gray-200">Conta</p>
            <nav className="mt-3 flex flex-col gap-2 text-sm text-gray-400">
              <Link to="/login" className="hover:text-white">
                Entrar
              </Link>
              <Link to="/register" className="hover:text-white">
                Cadastrar
              </Link>
              <Link to="/orders" className="hover:text-white">
                Meus pedidos
              </Link>
            </nav>
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-gray-200">Contato</p>
            <div className="mt-3 space-y-2 text-sm text-gray-400">
              <p>contato@ecommerce.com</p>
              <p>(11) 99999-9999</p>
              <p>Segunda a sábado, 8h às 20h</p>
            </div>
          </div>
        </div>
        <div className="mt-8 border-t border-gray-800 pt-4 text-xs text-gray-500">
          © {year} E-commerce. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
}
