import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-gray-900 text-gray-300">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <h3 className="text-lg font-semibold text-white">E-commerce</h3>
            <p className="mt-2 text-sm">
              Sua loja online de confiança. Produtos de qualidade e entrega rápida.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">Links</h4>
            <ul className="mt-3 space-y-2">
              <li>
                <Link to="/products" className="text-sm hover:text-white">
                  Produtos
                </Link>
              </li>
              <li>
                <Link to="/blog" className="text-sm hover:text-white">
                  Blog
                </Link>
              </li>
              <li>
                <Link to="/cart" className="text-sm hover:text-white">
                  Carrinho
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">Conta</h4>
            <ul className="mt-3 space-y-2">
              <li>
                <Link to="/login" className="text-sm hover:text-white">
                  Entrar
                </Link>
              </li>
              <li>
                <Link to="/register" className="text-sm hover:text-white">
                  Cadastrar
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">Contato</h4>
            <p className="mt-3 text-sm">contato@ecommerce.com</p>
            <p className="text-sm">(11) 99999-9999</p>
          </div>
        </div>
        <div className="mt-8 border-t border-gray-800 pt-8 text-center text-sm">
          © {new Date().getFullYear()} E-commerce. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
}
