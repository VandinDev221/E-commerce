import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminHash = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@ecommerce.com' },
    create: {
      email: 'admin@ecommerce.com',
      passwordHash: adminHash,
      name: 'Administrador',
      role: 'ADMIN',
      emailVerified: true,
    },
    update: {},
  });
  console.log('Admin:', admin.email);

  const catEletronicos = await prisma.category.upsert({
    where: { slug: 'eletronicos' },
    create: { name: 'Eletrônicos', slug: 'eletronicos', description: 'Smartphones, notebooks e acessórios' },
    update: {},
  });
  const catRoupas = await prisma.category.upsert({
    where: { slug: 'roupas' },
    create: { name: 'Roupas', slug: 'roupas', description: 'Moda e vestuário' },
    update: {},
  });

  const product1 = await prisma.product.upsert({
    where: { slug: 'smartphone-x' },
    create: {
      name: 'Smartphone X',
      slug: 'smartphone-x',
      description: 'Smartphone com tela 6.5", 128GB, câmera tripla.',
      price: 1999.9,
      compareAtPrice: 2499.9,
      stock: 50,
      sku: 'SMX-001',
      categoryId: catEletronicos.id,
      images: ['https://placehold.co/600x600?text=Smartphone'],
      featured: true,
      published: true,
    },
    update: {},
  });
  const product2 = await prisma.product.upsert({
    where: { slug: 'notebook-pro' },
    create: {
      name: 'Notebook Pro',
      slug: 'notebook-pro',
      description: 'Notebook 15.6", 16GB RAM, SSD 512GB.',
      price: 4599.9,
      stock: 20,
      sku: 'NB-PRO-01',
      categoryId: catEletronicos.id,
      images: ['https://placehold.co/600x600?text=Notebook'],
      featured: true,
      published: true,
    },
    update: {},
  });
  const product3 = await prisma.product.upsert({
    where: { slug: 'camiseta-basica' },
    create: {
      name: 'Camiseta Básica',
      slug: 'camiseta-basica',
      description: 'Camiseta 100% algodão, diversas cores.',
      price: 49.9,
      stock: 200,
      categoryId: catRoupas.id,
      images: ['https://placehold.co/600x600?text=Camiseta'],
      published: true,
    },
    update: {},
  });

  // Mais produtos de exemplo
  const moreProducts = [
    {
      slug: 'smartphone-lite',
      name: 'Smartphone Lite',
      description: 'Smartphone de entrada com 64GB e câmera dupla.',
      price: 1299.9,
      compareAtPrice: 1499.9,
      stock: 80,
      sku: 'SM-LITE-01',
      categoryId: catEletronicos.id,
      images: ['https://placehold.co/600x600?text=Smartphone+Lite'],
      featured: false,
    },
    {
      slug: 'smartphone-ultra',
      name: 'Smartphone Ultra',
      description: 'Topo de linha com 256GB, 5G e câmera quádrupla.',
      price: 4999.9,
      compareAtPrice: 5499.9,
      stock: 30,
      sku: 'SM-ULTRA-01',
      categoryId: catEletronicos.id,
      images: ['https://placehold.co/600x600?text=Smartphone+Ultra'],
      featured: true,
    },
    {
      slug: 'notebook-gamer',
      name: 'Notebook Gamer',
      description: 'Notebook gamer com GPU dedicada e 16GB RAM.',
      price: 6999.9,
      compareAtPrice: 7499.9,
      stock: 15,
      sku: 'NB-GAMER-01',
      categoryId: catEletronicos.id,
      images: ['https://placehold.co/600x600?text=Notebook+Gamer'],
      featured: true,
    },
    {
      slug: 'notebook-ultrabook',
      name: 'Ultrabook Slim',
      description: 'Ultrabook leve com SSD 1TB e tela 14".',
      price: 5599.9,
      compareAtPrice: 5999.9,
      stock: 25,
      sku: 'NB-SLIM-01',
      categoryId: catEletronicos.id,
      images: ['https://placehold.co/600x600?text=Ultrabook'],
      featured: false,
    },
    {
      slug: 'fone-bluetooth',
      name: 'Fone Bluetooth',
      description: 'Fones de ouvido sem fio com estojo de carregamento.',
      price: 299.9,
      compareAtPrice: 349.9,
      stock: 200,
      sku: 'FONE-BT-01',
      categoryId: catEletronicos.id,
      images: ['https://placehold.co/600x600?text=Fone+Bluetooth'],
      featured: false,
    },
    {
      slug: 'smartwatch-fit',
      name: 'Smartwatch Fit',
      description: 'Relógio inteligente com monitoramento de atividades.',
      price: 399.9,
      compareAtPrice: 499.9,
      stock: 120,
      sku: 'SW-FIT-01',
      categoryId: catEletronicos.id,
      images: ['https://placehold.co/600x600?text=Smartwatch'],
      featured: true,
    },
    {
      slug: 'camera-action',
      name: 'Câmera de Ação 4K',
      description: 'Câmera de ação à prova d\'água com gravação 4K.',
      price: 899.9,
      compareAtPrice: 999.9,
      stock: 40,
      sku: 'CAM-4K-01',
      categoryId: catEletronicos.id,
      images: ['https://placehold.co/600x600?text=Camera+4K'],
      featured: false,
    },
    {
      slug: 'monitor-27',
      name: 'Monitor 27" Full HD',
      description: 'Monitor de 27 polegadas com 75Hz.',
      price: 1299.9,
      compareAtPrice: 1499.9,
      stock: 35,
      sku: 'MON-27FHD-01',
      categoryId: catEletronicos.id,
      images: ['https://placehold.co/600x600?text=Monitor+27'],
      featured: false,
    },
    {
      slug: 'teclado-mecanico',
      name: 'Teclado Mecânico RGB',
      description: 'Teclado mecânico com iluminação RGB e switches azuis.',
      price: 449.9,
      compareAtPrice: 499.9,
      stock: 60,
      sku: 'TEC-MEC-01',
      categoryId: catEletronicos.id,
      images: ['https://placehold.co/600x600?text=Teclado'],
      featured: false,
    },
    {
      slug: 'mouse-gamer',
      name: 'Mouse Gamer 7200 DPI',
      description: 'Mouse gamer ergonômico com ajuste de DPI.',
      price: 199.9,
      compareAtPrice: 249.9,
      stock: 150,
      sku: 'MOUSE-GAME-01',
      categoryId: catEletronicos.id,
      images: ['https://placehold.co/600x600?text=Mouse+Gamer'],
      featured: false,
    },
    {
      slug: 'roupa-camiseta-estampa',
      name: 'Camiseta Estampada',
      description: 'Camiseta 100% algodão com estampa exclusiva.',
      price: 69.9,
      compareAtPrice: 89.9,
      stock: 180,
      sku: 'CAM-EST-01',
      categoryId: catRoupas.id,
      images: ['https://placehold.co/600x600?text=Camiseta+Estampada'],
      featured: true,
    },
    {
      slug: 'camiseta-premium',
      name: 'Camiseta Premium',
      description: 'Camiseta premium com fio penteado.',
      price: 89.9,
      compareAtPrice: 109.9,
      stock: 160,
      sku: 'CAM-PREM-01',
      categoryId: catRoupas.id,
      images: ['https://placehold.co/600x600?text=Camiseta+Premium'],
      featured: false,
    },
    {
      slug: 'calca-jeans-skinny',
      name: 'Calça Jeans Skinny',
      description: 'Calça jeans skinny com elastano.',
      price: 149.9,
      compareAtPrice: 169.9,
      stock: 100,
      sku: 'CAL-JEANS-01',
      categoryId: catRoupas.id,
      images: ['https://placehold.co/600x600?text=Calca+Jeans'],
      featured: false,
    },
    {
      slug: 'calca-moletom',
      name: 'Calça Moletom',
      description: 'Calça moletom confortável para o dia a dia.',
      price: 129.9,
      compareAtPrice: 149.9,
      stock: 90,
      sku: 'CAL-MOL-01',
      categoryId: catRoupas.id,
      images: ['https://placehold.co/600x600?text=Calca+Moletom'],
      featured: false,
    },
    {
      slug: 'jaqueta-jeans',
      name: 'Jaqueta Jeans',
      description: 'Jaqueta jeans clássica unissex.',
      price: 199.9,
      compareAtPrice: 229.9,
      stock: 70,
      sku: 'JAQ-JEANS-01',
      categoryId: catRoupas.id,
      images: ['https://placehold.co/600x600?text=Jaqueta+Jeans'],
      featured: true,
    },
    {
      slug: 'jaqueta-couro-sintetico',
      name: 'Jaqueta Couro Sintético',
      description: 'Jaqueta em couro sintético com forro interno.',
      price: 249.9,
      compareAtPrice: 299.9,
      stock: 55,
      sku: 'JAQ-COURO-01',
      categoryId: catRoupas.id,
      images: ['https://placehold.co/600x600?text=Jaqueta+Couro'],
      featured: false,
    },
    {
      slug: 'tenis-casual',
      name: 'Tênis Casual',
      description: 'Tênis casual confortável para o dia a dia.',
      price: 179.9,
      compareAtPrice: 199.9,
      stock: 120,
      sku: 'TEN-CAS-01',
      categoryId: catRoupas.id,
      images: ['https://placehold.co/600x600?text=Tenis+Casual'],
      featured: false,
    },
    {
      slug: 'tenis-esportivo',
      name: 'Tênis Esportivo',
      description: 'Tênis esportivo leve para corrida e caminhada.',
      price: 219.9,
      compareAtPrice: 249.9,
      stock: 110,
      sku: 'TEN-ESP-01',
      categoryId: catRoupas.id,
      images: ['https://placehold.co/600x600?text=Tenis+Esportivo'],
      featured: true,
    },
    {
      slug: 'vestido-midi',
      name: 'Vestido Midi',
      description: 'Vestido midi floral para ocasiões especiais.',
      price: 159.9,
      compareAtPrice: 189.9,
      stock: 80,
      sku: 'VES-MIDI-01',
      categoryId: catRoupas.id,
      images: ['https://placehold.co/600x600?text=Vestido+Midi'],
      featured: false,
    },
    {
      slug: 'vestido-curto',
      name: 'Vestido Curto',
      description: 'Vestido curto casual, ideal para o verão.',
      price: 139.9,
      compareAtPrice: 159.9,
      stock: 90,
      sku: 'VES-CURTO-01',
      categoryId: catRoupas.id,
      images: ['https://placehold.co/600x600?text=Vestido+Curto'],
      featured: false,
    },
    {
      slug: 'camisa-social',
      name: 'Camisa Social',
      description: 'Camisa social masculina em algodão.',
      price: 119.9,
      compareAtPrice: 139.9,
      stock: 100,
      sku: 'CAM-SOCIAL-01',
      categoryId: catRoupas.id,
      images: ['https://placehold.co/600x600?text=Camisa+Social'],
      featured: false,
    },
    {
      slug: 'blusa-trico',
      name: 'Blusa de Tricô',
      description: 'Blusa de tricô macia e confortável.',
      price: 129.9,
      compareAtPrice: 149.9,
      stock: 85,
      sku: 'BLU-TRICO-01',
      categoryId: catRoupas.id,
      images: ['https://placehold.co/600x600?text=Blusa+Trico'],
      featured: false,
    },
    {
      slug: 'shorts-jeans',
      name: 'Shorts Jeans',
      description: 'Shorts jeans feminino cintura alta.',
      price: 89.9,
      compareAtPrice: 99.9,
      stock: 130,
      sku: 'SHO-JEANS-01',
      categoryId: catRoupas.id,
      images: ['https://placehold.co/600x600?text=Shorts+Jeans'],
      featured: false,
    },
    {
      slug: 'shorts-moletom',
      name: 'Shorts Moletom',
      description: 'Shorts moletom unissex para treino ou lazer.',
      price: 79.9,
      compareAtPrice: 89.9,
      stock: 140,
      sku: 'SHO-MOL-01',
      categoryId: catRoupas.id,
      images: ['https://placehold.co/600x600?text=Shorts+Moletom'],
      featured: false,
    },
    {
      slug: 'meia-algodao',
      name: 'Meias de Algodão (kit com 3)',
      description: 'Kit com 3 pares de meias de algodão.',
      price: 29.9,
      compareAtPrice: 39.9,
      stock: 300,
      sku: 'MEIA-ALG-01',
      categoryId: catRoupas.id,
      images: ['https://placehold.co/600x600?text=Meias'],
      featured: false,
    },
    {
      slug: 'bon%C3%A9-aba-curva',
      name: 'Boné Aba Curva',
      description: 'Boné clássico aba curva com ajuste traseiro.',
      price: 59.9,
      compareAtPrice: 69.9,
      stock: 120,
      sku: 'BONE-ABA-01',
      categoryId: catRoupas.id,
      images: ['https://placehold.co/600x600?text=Bone'],
      featured: false,
    },
    {
      slug: 'mala-viagem',
      name: 'Mala de Viagem Média',
      description: 'Mala de viagem com rodinhas e cadeado TSA.',
      price: 399.9,
      compareAtPrice: 449.9,
      stock: 50,
      sku: 'MALA-MED-01',
      categoryId: catRoupas.id,
      images: ['https://placehold.co/600x600?text=Mala+Viagem'],
      featured: false,
    },
    {
      slug: 'mochila-notebook',
      name: 'Mochila para Notebook',
      description: 'Mochila acolchoada para notebook até 15.6".',
      price: 189.9,
      compareAtPrice: 219.9,
      stock: 90,
      sku: 'MOCH-NOTE-01',
      categoryId: catEletronicos.id,
      images: ['https://placehold.co/600x600?text=Mochila'],
      featured: false,
    },
    {
      slug: 'carregador-portatil',
      name: 'Carregador Portátil 20.000mAh',
      description: 'Powerbank com 20.000mAh e duas portas USB.',
      price: 229.9,
      compareAtPrice: 259.9,
      stock: 130,
      sku: 'PWR-20000-01',
      categoryId: catEletronicos.id,
      images: ['https://placehold.co/600x600?text=Powerbank'],
      featured: true,
    },
    {
      slug: 'hub-usb-c',
      name: 'Hub USB-C 7 em 1',
      description: 'Hub USB-C com HDMI, USB 3.0 e leitor de cartão.',
      price: 259.9,
      compareAtPrice: 289.9,
      stock: 70,
      sku: 'HUB-USBC-01',
      categoryId: catEletronicos.id,
      images: ['https://placehold.co/600x600?text=Hub+USB-C'],
      featured: false,
    },
  ];

  for (const p of moreProducts) {
    // eslint-disable-next-line no-await-in-loop
    await prisma.product.upsert({
      where: { slug: p.slug },
      create: {
        ...p,
        published: true,
      },
      update: {},
    });
  }

  const coupon = await prisma.coupon.upsert({
    where: { code: 'PRIMEIRACOMPRA' },
    create: {
      code: 'PRIMEIRACOMPRA',
      type: 'PERCENTAGE',
      value: 10,
      minPurchase: 100,
      maxUses: 1000,
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      active: true,
    },
    update: {},
  });

  const blogCover = (text: string) =>
    `https://placehold.co/600x400?text=${encodeURIComponent(text).replace(/%20/g, '+')}`;

  const blogPosts = [
    {
      slug: 'bem-vindo-ao-nosso-ecommerce',
      title: 'Bem-vindo ao nosso e-commerce',
      excerpt: 'Conheça nossa loja, as melhores ofertas e como aproveitar cada compra.',
      content: `<p>Este é o primeiro post do blog. Aqui você encontra dicas, novidades e tendências.</p>
        <p>Nossa missão é oferecer produtos de qualidade com preços justos e um atendimento que faz a diferença.</p>
        <p>Navegue pelas categorias, use os filtros e não deixe de conferir as promoções em destaque.</p>`,
      coverImage: blogCover('Bem-vindo'),
    },
    {
      slug: 'dicas-para-comprar-online-com-seguranca',
      title: 'Dicas para comprar online com segurança',
      excerpt: 'Confira como fazer compras na internet sem sustos: pagamento, dados e entrega.',
      content: `<p>Comprar online é prático, mas exige alguns cuidados. Confira abaixo.</p>
        <h3>1. Site confiável</h3><p>Verifique se a loja tem HTTPS, política de privacidade e canais de contato.</p>
        <h3>2. Formas de pagamento</h3><p>Prefira cartão em ambiente seguro ou métodos que ofereçam proteção ao comprador.</p>
        <h3>3. Dados pessoais</h3><p>Nunca envie senhas ou dados do cartão por e-mail ou mensagem.</p>
        <h3>4. Prazo e entrega</h3><p>Confira o prazo de entrega e a política de trocas antes de finalizar.</p>`,
      coverImage: blogCover('Compras+Seguras'),
    },
    {
      slug: 'como-escolher-o-melhor-smartphone',
      title: 'Como escolher o melhor smartphone',
      excerpt: 'Tela, câmera, bateria e armazenamento: o que priorizar na hora de comprar.',
      content: `<p>O celular virou item essencial. Veja o que considerar na escolha.</p>
        <p><strong>Tela:</strong> tamanho e qualidade (AMOLED, taxa de atualização) influenciam no uso no dia a dia.</p>
        <p><strong>Câmera:</strong> megapixels não são tudo; veja fotos de exemplo e testes de vídeo.</p>
        <p><strong>Bateria:</strong> mAh + otimização do sistema definem a duração. Carregamento rápido é um plus.</p>
        <p><strong>Armazenamento:</strong> 128GB costuma ser o mínimo confortável; 256GB ou mais se você grava muitos vídeos.</p>`,
      coverImage: blogCover('Smartphone'),
    },
    {
      slug: 'tendencias-de-moda-para-esta-temporada',
      title: 'Tendências de moda para esta temporada',
      excerpt: 'Cores, peças e estilos que estão em alta nas vitrines e nas ruas.',
      content: `<p>A moda está sempre em movimento. Separamos o que está em alta nesta temporada.</p>
        <p><strong>Cores:</strong> tons terrosos, verde e azul continuam fortes; o laranja ganha espaço.</p>
        <p><strong>Peças:</strong> blazers oversized, calças wide leg e tênis de corrida no look casual.</p>
        <p><strong>Estilo:</strong> conforto e versatilidade seguem como prioridade, com peças que transitam do dia a noite.</p>`,
      coverImage: blogCover('Moda'),
    },
    {
      slug: 'black-friday-o-que-observar-antes-de-comprar',
      title: 'Black Friday: o que observar antes de comprar',
      excerpt: 'Evite armadilhas: compare preços, leia avaliações e defina um orçamento.',
      content: `<p>A Black Friday pode trazer bons descontos, mas é preciso estar atento.</p>
        <p><strong>Pesquise antes:</strong> anote o preço dos itens que deseja nas semanas anteriores.</p>
        <p><strong>Compare:</strong> o mesmo produto pode ter preços diferentes em várias lojas.</p>
        <p><strong>Avaliações:</strong> leia comentários de quem já comprou para evitar produtos ruins.</p>
        <p><strong>Orçamento:</strong> defina um limite e evite compras por impulso.</p>`,
      coverImage: blogCover('Black+Friday'),
    },
    {
      slug: 'cuidados-com-seus-eletronicos-no-dia-a-dia',
      title: 'Cuidados com seus eletrônicos no dia a dia',
      excerpt: 'Bateria, poeira, temperatura e transporte: dicas para conservar seus aparelhos.',
      content: `<p>Eletrônicos duram mais com alguns cuidados simples.</p>
        <p><strong>Bateria:</strong> evite descarregar até 0% sempre; manter entre 20% e 80% ajuda a preservar.</p>
        <p><strong>Limpeza:</strong> use pano seco e evite produtos abrasivos nas telas.</p>
        <p><strong>Calor e umidade:</strong> não deixe aparelhos no sol ou em ambientes muito úmidos.</p>
        <p><strong>Transporte:</strong> use capas e bolsas adequadas para evitar impactos.</p>`,
      coverImage: blogCover('Eletronicos'),
    },
  ];

  for (const p of blogPosts) {
    await prisma.post.upsert({
      where: { slug: p.slug },
      create: { ...p, published: true },
      update: {},
    });
  }

  console.log('Seed concluído:', { admin: admin.email, products: 3 + moreProducts.length, categories: 2, coupon: coupon.code, posts: blogPosts.length });
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
