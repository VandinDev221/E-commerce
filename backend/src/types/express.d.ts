declare global {
  namespace Express {
    // `passport` adiciona `Express.User` e faz `Request.user?: User`.
    // Definimos aqui o shape que a aplicação usa para evitar conflitos de tipo.
    interface User {
      id: string;
      email: string;
      role: string;
    }

    interface Request {
      user?: User;
    }
  }
}

export {};
