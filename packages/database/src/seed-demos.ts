import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seedDemos() {
  console.log('🍕 Criando demos...\n');

  const profPlan = await prisma.plan.findUnique({ where: { slug: 'profissional' } });
  if (!profPlan) throw new Error('Plano profissional não encontrado');

  const password = await bcrypt.hash('demo1234', 12);
  const trialEndsAt = new Date('2027-12-31');

  // ============================================================
  // 1. PIZZARIA DO MARIO
  // ============================================================
  console.log('🍕 Criando Pizzaria do Mario...');

  const pizzaria = await prisma.tenant.upsert({
    where: { slug: 'pizzaria-do-mario' },
    update: {},
    create: {
      slug: 'pizzaria-do-mario',
      name: 'Pizzaria do Mario',
      phone: '11999990001',
      email: 'demo-pizzaria@pedirei.online',
      address: 'Rua das Pizzas, 123 - Centro, São Paulo - SP',
      primaryColor: '#DC2626',
      secondaryColor: '#F59E0B',
      isActive: true,
      trialEndsAt,
      planId: profPlan.id,
      orderMode: 'CLIENT_CHOOSES',
      deliveryFeeMode: 'FIXED',
      fixedDeliveryFee: 8.00,
      estimatedDelivery: '35-50 min',
      minOrderValue: 25.00,
      feedbackEnabled: true,
      feedbackDelayMin: 90,
      pixOnDelivery: true,
      cashEnabled: true,
      cardCreditEnabled: true,
      cardDebitEnabled: true,
      msgReceived: '🍕 Pedido recebido! Já estamos preparando sua pizza!',
      msgPreparing: '👨‍🍳 Sua pizza está no forno! Já já sai!',
      msgOutDelivery: '🛵 Sua pizza saiu para entrega! Fique de olho!',
      msgDelivered: '✅ Pizza entregue! Bom apetite! 🍕',
    },
  });

  // Operator
  await prisma.operator.upsert({
    where: { tenantId_email: { tenantId: pizzaria.id, email: 'demo-pizzaria@pedirei.online' } },
    update: {},
    create: {
      tenantId: pizzaria.id,
      name: 'Mario Silva',
      email: 'demo-pizzaria@pedirei.online',
      password,
      role: 'OWNER',
      emailConfirmedAt: new Date(),
    },
  });

  // Admin Phone
  await prisma.adminPhone.upsert({
    where: { tenantId_phone: { tenantId: pizzaria.id, phone: '11999990001' } },
    update: {},
    create: {
      tenantId: pizzaria.id,
      phone: '11999990001',
      name: 'Mario Silva',
      role: 'OWNER',
    },
  });

  // Operating Hours (Ter-Dom 18h-23h)
  for (let day = 0; day <= 6; day++) {
    const isOpen = day !== 1; // Fecha segunda
    await prisma.operatingHour.upsert({
      where: { tenantId_dayOfWeek: { tenantId: pizzaria.id, dayOfWeek: day } },
      update: {},
      create: {
        tenantId: pizzaria.id,
        dayOfWeek: day,
        openTime: '18:00',
        closeTime: '23:00',
        isOpen,
      },
    });
  }

  // Delivery Zones
  const pizzaZones = [
    { name: 'Até 3km', minDistance: 0, maxDistance: 3, fee: 5.00 },
    { name: '3km - 6km', minDistance: 3, maxDistance: 6, fee: 8.00 },
    { name: '6km - 10km', minDistance: 6, maxDistance: 10, fee: 12.00 },
  ];
  for (const z of pizzaZones) {
    await prisma.deliveryZone.create({
      data: { tenantId: pizzaria.id, ...z },
    });
  }

  // Categories
  const pizzaCats = await Promise.all([
    prisma.category.create({ data: { tenantId: pizzaria.id, name: 'Pizzas Tradicionais', description: 'Nossas pizzas clássicas', sortOrder: 1 } }),
    prisma.category.create({ data: { tenantId: pizzaria.id, name: 'Pizzas Premium', description: 'Sabores especiais com ingredientes selecionados', sortOrder: 2 } }),
    prisma.category.create({ data: { tenantId: pizzaria.id, name: 'Pizzas Doces', description: 'Para fechar com chave de ouro', sortOrder: 3 } }),
    prisma.category.create({ data: { tenantId: pizzaria.id, name: 'Bebidas', description: 'Refrigerantes, sucos e mais', sortOrder: 4 } }),
    prisma.category.create({ data: { tenantId: pizzaria.id, name: 'Bordas Recheadas', description: 'Acrescente uma borda especial', sortOrder: 5 } }),
  ]);

  const [catTrad, catPrem, catDoce, catBebPizza, catBordas] = pizzaCats;

  // Menu Items - Tradicionais
  const pizzaItems = await Promise.all([
    prisma.menuItem.create({ data: { tenantId: pizzaria.id, categoryId: catTrad.id, name: 'Margherita', description: 'Molho de tomate, mussarela, manjericão fresco e azeite', price: 39.90, sortOrder: 1 } }),
    prisma.menuItem.create({ data: { tenantId: pizzaria.id, categoryId: catTrad.id, name: 'Calabresa', description: 'Calabresa fatiada, cebola roxa e azeitonas', price: 42.90, sortOrder: 2 } }),
    prisma.menuItem.create({ data: { tenantId: pizzaria.id, categoryId: catTrad.id, name: 'Portuguesa', description: 'Presunto, ovos, cebola, azeitona, ervilha e mussarela', price: 44.90, sortOrder: 3 } }),
    prisma.menuItem.create({ data: { tenantId: pizzaria.id, categoryId: catTrad.id, name: 'Frango com Catupiry', description: 'Frango desfiado com catupiry cremoso', price: 44.90, sortOrder: 4 } }),
    prisma.menuItem.create({ data: { tenantId: pizzaria.id, categoryId: catTrad.id, name: 'Quatro Queijos', description: 'Mussarela, provolone, parmesão e gorgonzola', price: 46.90, sortOrder: 5 } }),
    prisma.menuItem.create({ data: { tenantId: pizzaria.id, categoryId: catTrad.id, name: 'Pepperoni', description: 'Pepperoni importado com mussarela e orégano', price: 45.90, sortOrder: 6 } }),
    prisma.menuItem.create({ data: { tenantId: pizzaria.id, categoryId: catTrad.id, name: 'Napolitana', description: 'Tomate fatiado, mussarela, parmesão e manjericão', price: 41.90, sortOrder: 7 } }),
    prisma.menuItem.create({ data: { tenantId: pizzaria.id, categoryId: catTrad.id, name: 'Mussarela', description: 'Mussarela, tomate e orégano', price: 36.90, sortOrder: 8 } }),
  ]);

  // Premium
  const premItems = await Promise.all([
    prisma.menuItem.create({ data: { tenantId: pizzaria.id, categoryId: catPrem.id, name: 'Filé Mignon com Cheddar', description: 'Filé mignon em cubos, cheddar cremoso e bacon crocante', price: 59.90, sortOrder: 1 } }),
    prisma.menuItem.create({ data: { tenantId: pizzaria.id, categoryId: catPrem.id, name: 'Camarão', description: 'Camarões salteados no alho com catupiry e mussarela', price: 64.90, sortOrder: 2 } }),
    prisma.menuItem.create({ data: { tenantId: pizzaria.id, categoryId: catPrem.id, name: 'Parma', description: 'Presunto parma, rúcula, tomate seco e parmesão', price: 56.90, sortOrder: 3 } }),
    prisma.menuItem.create({ data: { tenantId: pizzaria.id, categoryId: catPrem.id, name: 'Trufada', description: 'Mussarela de búfala, cogumelos e azeite trufado', price: 62.90, sortOrder: 4 } }),
  ]);

  // Doces
  await Promise.all([
    prisma.menuItem.create({ data: { tenantId: pizzaria.id, categoryId: catDoce.id, name: 'Chocolate com Morango', description: 'Chocolate ao leite, morangos frescos e leite condensado', price: 44.90, sortOrder: 1 } }),
    prisma.menuItem.create({ data: { tenantId: pizzaria.id, categoryId: catDoce.id, name: 'Romeu e Julieta', description: 'Goiabada cascão com queijo minas derretido', price: 39.90, sortOrder: 2 } }),
    prisma.menuItem.create({ data: { tenantId: pizzaria.id, categoryId: catDoce.id, name: 'Banana com Canela', description: 'Banana caramelizada, canela e leite condensado', price: 38.90, sortOrder: 3 } }),
  ]);

  // Bebidas
  const bebPizzaItems = await Promise.all([
    prisma.menuItem.create({ data: { tenantId: pizzaria.id, categoryId: catBebPizza.id, name: 'Coca-Cola 2L', description: 'Coca-Cola original 2 litros', price: 14.90, sortOrder: 1 } }),
    prisma.menuItem.create({ data: { tenantId: pizzaria.id, categoryId: catBebPizza.id, name: 'Guaraná Antarctica 2L', description: 'Guaraná Antarctica 2 litros', price: 12.90, sortOrder: 2 } }),
    prisma.menuItem.create({ data: { tenantId: pizzaria.id, categoryId: catBebPizza.id, name: 'Coca-Cola Lata', description: 'Coca-Cola 350ml', price: 6.90, sortOrder: 3 } }),
    prisma.menuItem.create({ data: { tenantId: pizzaria.id, categoryId: catBebPizza.id, name: 'Suco de Laranja 500ml', description: 'Suco natural de laranja', price: 9.90, sortOrder: 4 } }),
    prisma.menuItem.create({ data: { tenantId: pizzaria.id, categoryId: catBebPizza.id, name: 'Água Mineral 500ml', description: 'Água mineral sem gás', price: 4.90, sortOrder: 5 } }),
  ]);

  // Bordas
  await Promise.all([
    prisma.menuItem.create({ data: { tenantId: pizzaria.id, categoryId: catBordas.id, name: 'Borda de Cheddar', description: 'Borda recheada com cheddar cremoso', price: 12.00, sortOrder: 1 } }),
    prisma.menuItem.create({ data: { tenantId: pizzaria.id, categoryId: catBordas.id, name: 'Borda de Catupiry', description: 'Borda recheada com catupiry original', price: 12.00, sortOrder: 2 } }),
    prisma.menuItem.create({ data: { tenantId: pizzaria.id, categoryId: catBordas.id, name: 'Borda de Chocolate', description: 'Borda recheada com chocolate ao leite', price: 10.00, sortOrder: 3 } }),
  ]);

  // Customers (Pizzaria)
  const pizzaCustomers = await Promise.all([
    prisma.customer.create({ data: { tenantId: pizzaria.id, phone: '11988881111', name: 'Ana Costa', address: 'Rua Augusta, 456 - Consolação', isRegistered: true, totalOrders: 12, totalSpent: 580.50, lastOrderAt: new Date('2026-03-01') } }),
    prisma.customer.create({ data: { tenantId: pizzaria.id, phone: '11988882222', name: 'Bruno Martins', address: 'Av. Paulista, 1000 - Bela Vista', isRegistered: true, totalOrders: 8, totalSpent: 420.00, lastOrderAt: new Date('2026-02-28') } }),
    prisma.customer.create({ data: { tenantId: pizzaria.id, phone: '11988883333', name: 'Camila Souza', address: 'Rua Oscar Freire, 200 - Pinheiros', isRegistered: true, totalOrders: 5, totalSpent: 290.70, lastOrderAt: new Date('2026-03-02') } }),
    prisma.customer.create({ data: { tenantId: pizzaria.id, phone: '11988884444', name: 'Diego Oliveira', address: 'Rua Haddock Lobo, 80 - Jardins', isRegistered: true, totalOrders: 3, totalSpent: 165.80, lastOrderAt: new Date('2026-02-25') } }),
    prisma.customer.create({ data: { tenantId: pizzaria.id, phone: '11988885555', name: 'Elena Ferreira', address: 'Rua da Consolação, 1500', isRegistered: true, totalOrders: 15, totalSpent: 890.00, feedbackAvg: 4.8, feedbackCount: 10, lastOrderAt: new Date('2026-03-03') } }),
  ]);

  // Orders (Pizzaria) — mix of statuses
  const now = new Date();
  const orders = [
    { customer: pizzaCustomers[4], items: [{ item: pizzaItems[0], qty: 1 }, { item: pizzaItems[4], qty: 1 }, { item: bebPizzaItems[0], qty: 1 }], status: 'DELIVERED' as const, payment: 'PIX_DELIVERY' as const, payStatus: 'CONFIRMED' as const, ago: 2 * 3600000, num: 101 },
    { customer: pizzaCustomers[0], items: [{ item: premItems[0], qty: 1 }, { item: bebPizzaItems[2], qty: 2 }], status: 'DELIVERED' as const, payment: 'CASH' as const, payStatus: 'CONFIRMED' as const, ago: 26 * 3600000, num: 100 },
    { customer: pizzaCustomers[2], items: [{ item: pizzaItems[2], qty: 2 }, { item: bebPizzaItems[1], qty: 1 }], status: 'DELIVERED' as const, payment: 'CREDIT_CARD' as const, payStatus: 'CONFIRMED' as const, ago: 50 * 3600000, num: 99 },
    { customer: pizzaCustomers[1], items: [{ item: premItems[1], qty: 1 }], status: 'PREPARING' as const, payment: 'PIX_DELIVERY' as const, payStatus: 'PENDING' as const, ago: 900000, num: 102 },
    { customer: pizzaCustomers[3], items: [{ item: pizzaItems[5], qty: 1 }, { item: pizzaItems[3], qty: 1 }, { item: bebPizzaItems[0], qty: 1 }], status: 'RECEIVED' as const, payment: 'CASH' as const, payStatus: 'PENDING' as const, ago: 300000, num: 103 },
    { customer: pizzaCustomers[4], items: [{ item: pizzaItems[1], qty: 1 }, { item: bebPizzaItems[3], qty: 1 }], status: 'OUT_FOR_DELIVERY' as const, payment: 'DEBIT_CARD' as const, payStatus: 'CONFIRMED' as const, ago: 1800000, num: 104 },
  ];

  for (const o of orders) {
    const subtotal = o.items.reduce((sum, i) => sum + Number(i.item.price) * i.qty, 0);
    const total = subtotal + 8;
    const createdAt = new Date(now.getTime() - o.ago);
    await prisma.order.create({
      data: {
        tenantId: pizzaria.id,
        customerId: o.customer.id,
        orderNumber: o.num,
        status: o.status,
        subtotal,
        deliveryFee: 8.00,
        totalAmount: total,
        paymentMethod: o.payment,
        paymentStatus: o.payStatus,
        estimatedDelivery: '35-50 min',
        createdAt,
        confirmedAt: ['PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(o.status) ? new Date(createdAt.getTime() + 60000) : undefined,
        preparingAt: ['PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(o.status) ? new Date(createdAt.getTime() + 120000) : undefined,
        outDeliveryAt: ['OUT_FOR_DELIVERY', 'DELIVERED'].includes(o.status) ? new Date(createdAt.getTime() + 1200000) : undefined,
        deliveredAt: o.status === 'DELIVERED' ? new Date(createdAt.getTime() + 2400000) : undefined,
        feedbackRating: o.status === 'DELIVERED' ? 5 : undefined,
        feedbackComment: o.status === 'DELIVERED' ? 'Pizza incrível! Chegou quentinha!' : undefined,
        feedbackAt: o.status === 'DELIVERED' ? new Date(createdAt.getTime() + 3600000) : undefined,
        items: {
          create: o.items.map((i) => ({
            menuItemId: i.item.id,
            name: i.item.name,
            price: i.item.price,
            quantity: i.qty,
          })),
        },
        statusHistory: {
          create: [
            { status: 'RECEIVED', createdAt },
            ...(['PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(o.status) ? [{ status: 'PREPARING' as const, createdAt: new Date(createdAt.getTime() + 120000) }] : []),
            ...(['OUT_FOR_DELIVERY', 'DELIVERED'].includes(o.status) ? [{ status: 'OUT_FOR_DELIVERY' as const, createdAt: new Date(createdAt.getTime() + 1200000) }] : []),
            ...(o.status === 'DELIVERED' ? [{ status: 'DELIVERED' as const, createdAt: new Date(createdAt.getTime() + 2400000) }] : []),
          ],
        },
      },
    });
  }

  console.log('  ✅ Pizzaria criada com sucesso!');
  console.log(`     Slug: pizzaria-do-mario`);
  console.log(`     ${8 + 4 + 3 + 5 + 3} itens de cardápio`);
  console.log(`     ${pizzaCustomers.length} clientes`);
  console.log(`     ${orders.length} pedidos\n`);

  // ============================================================
  // 2. RESTAURANTE SABOR DA TERRA
  // ============================================================
  console.log('🍽️  Criando Restaurante Sabor da Terra...');

  const restaurante = await prisma.tenant.upsert({
    where: { slug: 'sabor-da-terra' },
    update: {},
    create: {
      slug: 'sabor-da-terra',
      name: 'Restaurante Sabor da Terra',
      phone: '11999990002',
      email: 'demo-restaurante@pedirei.online',
      address: 'Av. Brasil, 500 - Centro, São Paulo - SP',
      primaryColor: '#059669',
      secondaryColor: '#D97706',
      isActive: true,
      trialEndsAt,
      planId: profPlan.id,
      orderMode: 'CLIENT_CHOOSES',
      deliveryFeeMode: 'FIXED',
      fixedDeliveryFee: 6.00,
      estimatedDelivery: '30-45 min',
      minOrderValue: 20.00,
      feedbackEnabled: true,
      feedbackDelayMin: 60,
      pixOnDelivery: true,
      cashEnabled: true,
      cardCreditEnabled: true,
      cardDebitEnabled: true,
      msgReceived: '🍽️ Pedido recebido! Já estamos preparando com carinho!',
      msgPreparing: '👨‍🍳 Seu pedido está sendo preparado na cozinha!',
      msgOutDelivery: '🛵 Comida a caminho! Aguarde poucos minutos!',
      msgDelivered: '✅ Pedido entregue! Bom apetite! 😋',
    },
  });

  // Operator
  await prisma.operator.upsert({
    where: { tenantId_email: { tenantId: restaurante.id, email: 'demo-restaurante@pedirei.online' } },
    update: {},
    create: {
      tenantId: restaurante.id,
      name: 'Fernanda Almeida',
      email: 'demo-restaurante@pedirei.online',
      password,
      role: 'OWNER',
      emailConfirmedAt: new Date(),
    },
  });

  await prisma.adminPhone.upsert({
    where: { tenantId_phone: { tenantId: restaurante.id, phone: '11999990002' } },
    update: {},
    create: {
      tenantId: restaurante.id,
      phone: '11999990002',
      name: 'Fernanda Almeida',
      role: 'OWNER',
    },
  });

  // Operating Hours (Seg-Sab 11h-15h, 18h-22h → simplificado almoço+jantar)
  for (let day = 0; day <= 6; day++) {
    const isOpen = day !== 0; // Fecha domingo
    await prisma.operatingHour.upsert({
      where: { tenantId_dayOfWeek: { tenantId: restaurante.id, dayOfWeek: day } },
      update: {},
      create: {
        tenantId: restaurante.id,
        dayOfWeek: day,
        openTime: '11:00',
        closeTime: '22:00',
        isOpen,
      },
    });
  }

  // Delivery Zones
  const restZones = [
    { name: 'Centro (até 2km)', minDistance: 0, maxDistance: 2, fee: 4.00 },
    { name: '2km - 5km', minDistance: 2, maxDistance: 5, fee: 6.00 },
    { name: '5km - 8km', minDistance: 5, maxDistance: 8, fee: 10.00 },
  ];
  for (const z of restZones) {
    await prisma.deliveryZone.create({
      data: { tenantId: restaurante.id, ...z },
    });
  }

  // Categories
  const restCats = await Promise.all([
    prisma.category.create({ data: { tenantId: restaurante.id, name: 'Pratos Executivos', description: 'Almoço completo com arroz, feijão e salada', sortOrder: 1 } }),
    prisma.category.create({ data: { tenantId: restaurante.id, name: 'Grelhados', description: 'Carnes nobres na brasa', sortOrder: 2 } }),
    prisma.category.create({ data: { tenantId: restaurante.id, name: 'Massas', description: 'Massas artesanais feitas na casa', sortOrder: 3 } }),
    prisma.category.create({ data: { tenantId: restaurante.id, name: 'Saladas', description: 'Opções leves e saudáveis', sortOrder: 4 } }),
    prisma.category.create({ data: { tenantId: restaurante.id, name: 'Sobremesas', description: 'Doces caseiros', sortOrder: 5 } }),
    prisma.category.create({ data: { tenantId: restaurante.id, name: 'Bebidas', sortOrder: 6 } }),
  ]);

  const [catExec, catGrelha, catMassa, catSalada, catSobremesa, catBebRest] = restCats;

  // Executivos
  const execItems = await Promise.all([
    prisma.menuItem.create({ data: { tenantId: restaurante.id, categoryId: catExec.id, name: 'Frango Grelhado', description: 'Peito de frango grelhado com arroz, feijão, farofa e salada', price: 28.90, sortOrder: 1 } }),
    prisma.menuItem.create({ data: { tenantId: restaurante.id, categoryId: catExec.id, name: 'Bife Acebolado', description: 'Bife de alcatra com cebola caramelizada, arroz, feijão e batata frita', price: 32.90, sortOrder: 2 } }),
    prisma.menuItem.create({ data: { tenantId: restaurante.id, categoryId: catExec.id, name: 'Peixe do Dia', description: 'Filé de tilápia grelhado com arroz, purê de mandioca e legumes', price: 34.90, sortOrder: 3 } }),
    prisma.menuItem.create({ data: { tenantId: restaurante.id, categoryId: catExec.id, name: 'Strogonoff de Frango', description: 'Strogonoff cremoso com arroz, batata palha e salada', price: 29.90, sortOrder: 4 } }),
    prisma.menuItem.create({ data: { tenantId: restaurante.id, categoryId: catExec.id, name: 'Feijoada Completa', description: 'Feijoada com arroz, couve, farofa, laranja e torresmo', price: 36.90, sortOrder: 5 } }),
    prisma.menuItem.create({ data: { tenantId: restaurante.id, categoryId: catExec.id, name: 'Escondidinho de Carne Seca', description: 'Purê de mandioca gratinado com carne seca desfiada', price: 31.90, sortOrder: 6 } }),
  ]);

  // Grelhados
  const grelhaItems = await Promise.all([
    prisma.menuItem.create({ data: { tenantId: restaurante.id, categoryId: catGrelha.id, name: 'Picanha na Brasa', description: 'Picanha grelhada (300g) com arroz, vinagrete e farofa', price: 59.90, sortOrder: 1 } }),
    prisma.menuItem.create({ data: { tenantId: restaurante.id, categoryId: catGrelha.id, name: 'Costela no Bafo', description: 'Costela bovina assada lentamente (400g) com mandioca', price: 54.90, sortOrder: 2 } }),
    prisma.menuItem.create({ data: { tenantId: restaurante.id, categoryId: catGrelha.id, name: 'Salmão Grelhado', description: 'Filé de salmão (250g) com risoto de limão siciliano', price: 62.90, sortOrder: 3 } }),
    prisma.menuItem.create({ data: { tenantId: restaurante.id, categoryId: catGrelha.id, name: 'Fraldinha Grelhada', description: 'Fraldinha (280g) com chimichurri, arroz e batata rústica', price: 52.90, sortOrder: 4 } }),
  ]);

  // Massas
  const massaItems = await Promise.all([
    prisma.menuItem.create({ data: { tenantId: restaurante.id, categoryId: catMassa.id, name: 'Lasanha Bolonhesa', description: 'Lasanha de carne moída com molho bolonhesa e bechamel', price: 38.90, sortOrder: 1 } }),
    prisma.menuItem.create({ data: { tenantId: restaurante.id, categoryId: catMassa.id, name: 'Fettuccine Alfredo', description: 'Fettuccine ao molho branco com frango e parmesão', price: 36.90, sortOrder: 2 } }),
    prisma.menuItem.create({ data: { tenantId: restaurante.id, categoryId: catMassa.id, name: 'Nhoque da Casa', description: 'Nhoque de batata artesanal ao molho sugo com manjericão', price: 32.90, sortOrder: 3 } }),
    prisma.menuItem.create({ data: { tenantId: restaurante.id, categoryId: catMassa.id, name: 'Espaguete Carbonara', description: 'Espaguete com bacon, gema, parmesão e pimenta preta', price: 35.90, sortOrder: 4 } }),
  ]);

  // Saladas
  await Promise.all([
    prisma.menuItem.create({ data: { tenantId: restaurante.id, categoryId: catSalada.id, name: 'Salada Caesar', description: 'Alface romana, croutons, parmesão e molho caesar com frango', price: 26.90, sortOrder: 1 } }),
    prisma.menuItem.create({ data: { tenantId: restaurante.id, categoryId: catSalada.id, name: 'Salada Tropical', description: 'Mix de folhas, manga, queijo branco, nozes e molho de maracujá', price: 24.90, sortOrder: 2 } }),
    prisma.menuItem.create({ data: { tenantId: restaurante.id, categoryId: catSalada.id, name: 'Bowl de Quinoa', description: 'Quinoa, grão de bico, abacate, tomate cereja e tahine', price: 29.90, sortOrder: 3 } }),
  ]);

  // Sobremesas
  const sobrItems = await Promise.all([
    prisma.menuItem.create({ data: { tenantId: restaurante.id, categoryId: catSobremesa.id, name: 'Pudim de Leite', description: 'Pudim de leite condensado com calda de caramelo', price: 14.90, sortOrder: 1 } }),
    prisma.menuItem.create({ data: { tenantId: restaurante.id, categoryId: catSobremesa.id, name: 'Petit Gâteau', description: 'Bolo de chocolate com centro derretido e sorvete de creme', price: 22.90, sortOrder: 2 } }),
    prisma.menuItem.create({ data: { tenantId: restaurante.id, categoryId: catSobremesa.id, name: 'Mousse de Maracujá', description: 'Mousse artesanal de maracujá', price: 12.90, sortOrder: 3 } }),
  ]);

  // Bebidas
  const bebRestItems = await Promise.all([
    prisma.menuItem.create({ data: { tenantId: restaurante.id, categoryId: catBebRest.id, name: 'Coca-Cola Lata', description: 'Coca-Cola 350ml', price: 6.90, sortOrder: 1 } }),
    prisma.menuItem.create({ data: { tenantId: restaurante.id, categoryId: catBebRest.id, name: 'Suco Natural', description: 'Laranja, limão, abacaxi ou maracujá (500ml)', price: 10.90, sortOrder: 2 } }),
    prisma.menuItem.create({ data: { tenantId: restaurante.id, categoryId: catBebRest.id, name: 'Água de Coco', description: 'Água de coco natural 500ml', price: 7.90, sortOrder: 3 } }),
    prisma.menuItem.create({ data: { tenantId: restaurante.id, categoryId: catBebRest.id, name: 'Cerveja Heineken Long Neck', description: 'Heineken 330ml', price: 12.90, sortOrder: 4 } }),
    prisma.menuItem.create({ data: { tenantId: restaurante.id, categoryId: catBebRest.id, name: 'Limonada Suíça', description: 'Limonada com leite condensado e hortelã', price: 11.90, sortOrder: 5 } }),
    prisma.menuItem.create({ data: { tenantId: restaurante.id, categoryId: catBebRest.id, name: 'Café Expresso', description: 'Café expresso curto ou longo', price: 5.90, sortOrder: 6 } }),
  ]);

  // Customers (Restaurante)
  const restCustomers = await Promise.all([
    prisma.customer.create({ data: { tenantId: restaurante.id, phone: '11977771111', name: 'Rafael Mendes', address: 'Rua Vergueiro, 1200 - Vila Mariana', isRegistered: true, totalOrders: 20, totalSpent: 780.00, feedbackAvg: 4.9, feedbackCount: 15, lastOrderAt: new Date('2026-03-03') } }),
    prisma.customer.create({ data: { tenantId: restaurante.id, phone: '11977772222', name: 'Juliana Santos', address: 'Av. Brigadeiro Luís Antônio, 800', isRegistered: true, totalOrders: 7, totalSpent: 310.50, lastOrderAt: new Date('2026-03-02') } }),
    prisma.customer.create({ data: { tenantId: restaurante.id, phone: '11977773333', name: 'Pedro Lima', address: 'Rua Joaquim Floriano, 400 - Itaim Bibi', isRegistered: true, totalOrders: 14, totalSpent: 620.80, feedbackAvg: 4.6, feedbackCount: 8, lastOrderAt: new Date('2026-03-01') } }),
    prisma.customer.create({ data: { tenantId: restaurante.id, phone: '11977774444', name: 'Mariana Costa', address: 'Rua Liberdade, 300 - Liberdade', isRegistered: true, totalOrders: 4, totalSpent: 185.00, lastOrderAt: new Date('2026-02-27') } }),
    prisma.customer.create({ data: { tenantId: restaurante.id, phone: '11977775555', name: 'Lucas Ribeiro', address: 'Rua Augusta, 1800 - Consolação', isRegistered: true, totalOrders: 10, totalSpent: 450.90, feedbackAvg: 5.0, feedbackCount: 7, lastOrderAt: new Date('2026-03-03') } }),
    prisma.customer.create({ data: { tenantId: restaurante.id, phone: '11977776666', name: 'Tatiana Vieira', address: 'Rua Bela Cintra, 150 - Cerqueira César', isRegistered: true, totalOrders: 6, totalSpent: 275.40, lastOrderAt: new Date('2026-03-02') } }),
  ]);

  // Orders (Restaurante)
  const restOrders = [
    { customer: restCustomers[0], items: [{ item: grelhaItems[0], qty: 1 }, { item: bebRestItems[3], qty: 2 }], status: 'DELIVERED' as const, payment: 'PIX_DELIVERY' as const, payStatus: 'CONFIRMED' as const, ago: 3 * 3600000, num: 201 },
    { customer: restCustomers[4], items: [{ item: execItems[4], qty: 2 }, { item: bebRestItems[1], qty: 2 }], status: 'DELIVERED' as const, payment: 'CASH' as const, payStatus: 'CONFIRMED' as const, ago: 5 * 3600000, num: 200 },
    { customer: restCustomers[1], items: [{ item: massaItems[0], qty: 1 }, { item: sobrItems[1], qty: 1 }, { item: bebRestItems[0], qty: 1 }], status: 'DELIVERED' as const, payment: 'CREDIT_CARD' as const, payStatus: 'CONFIRMED' as const, ago: 24 * 3600000, num: 199 },
    { customer: restCustomers[2], items: [{ item: grelhaItems[2], qty: 1 }, { item: bebRestItems[4], qty: 1 }], status: 'PREPARING' as const, payment: 'PIX_DELIVERY' as const, payStatus: 'PENDING' as const, ago: 600000, num: 202 },
    { customer: restCustomers[5], items: [{ item: execItems[0], qty: 1 }, { item: execItems[3], qty: 1 }, { item: bebRestItems[0], qty: 2 }], status: 'RECEIVED' as const, payment: 'CASH' as const, payStatus: 'PENDING' as const, ago: 180000, num: 203 },
    { customer: restCustomers[3], items: [{ item: massaItems[3], qty: 1 }, { item: sobrItems[0], qty: 1 }], status: 'OUT_FOR_DELIVERY' as const, payment: 'DEBIT_CARD' as const, payStatus: 'CONFIRMED' as const, ago: 2400000, num: 204 },
    { customer: restCustomers[0], items: [{ item: grelhaItems[1], qty: 1 }, { item: execItems[5], qty: 1 }, { item: bebRestItems[3], qty: 1 }, { item: sobrItems[2], qty: 2 }], status: 'DELIVERED' as const, payment: 'PIX_DELIVERY' as const, payStatus: 'CONFIRMED' as const, ago: 28 * 3600000, num: 198 },
    { customer: restCustomers[4], items: [{ item: execItems[1], qty: 1 }, { item: bebRestItems[5], qty: 1 }], status: 'RECEIVED' as const, payment: 'CASH' as const, payStatus: 'PENDING' as const, ago: 120000, num: 205 },
  ];

  for (const o of restOrders) {
    const subtotal = o.items.reduce((sum, i) => sum + Number(i.item.price) * i.qty, 0);
    const total = subtotal + 6;
    const createdAt = new Date(now.getTime() - o.ago);
    await prisma.order.create({
      data: {
        tenantId: restaurante.id,
        customerId: o.customer.id,
        orderNumber: o.num,
        status: o.status,
        subtotal,
        deliveryFee: 6.00,
        totalAmount: total,
        paymentMethod: o.payment,
        paymentStatus: o.payStatus,
        estimatedDelivery: '30-45 min',
        createdAt,
        confirmedAt: ['PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(o.status) ? new Date(createdAt.getTime() + 60000) : undefined,
        preparingAt: ['PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(o.status) ? new Date(createdAt.getTime() + 120000) : undefined,
        outDeliveryAt: ['OUT_FOR_DELIVERY', 'DELIVERED'].includes(o.status) ? new Date(createdAt.getTime() + 900000) : undefined,
        deliveredAt: o.status === 'DELIVERED' ? new Date(createdAt.getTime() + 1800000) : undefined,
        feedbackRating: o.status === 'DELIVERED' ? (Math.random() > 0.3 ? 5 : 4) : undefined,
        feedbackComment: o.status === 'DELIVERED' ? 'Comida deliciosa! Voltarei com certeza!' : undefined,
        feedbackAt: o.status === 'DELIVERED' ? new Date(createdAt.getTime() + 3600000) : undefined,
        items: {
          create: o.items.map((i) => ({
            menuItemId: i.item.id,
            name: i.item.name,
            price: i.item.price,
            quantity: i.qty,
          })),
        },
        statusHistory: {
          create: [
            { status: 'RECEIVED', createdAt },
            ...(['PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(o.status) ? [{ status: 'PREPARING' as const, createdAt: new Date(createdAt.getTime() + 120000) }] : []),
            ...(['OUT_FOR_DELIVERY', 'DELIVERED'].includes(o.status) ? [{ status: 'OUT_FOR_DELIVERY' as const, createdAt: new Date(createdAt.getTime() + 900000) }] : []),
            ...(o.status === 'DELIVERED' ? [{ status: 'DELIVERED' as const, createdAt: new Date(createdAt.getTime() + 1800000) }] : []),
          ],
        },
      },
    });
  }

  console.log('  ✅ Restaurante criado com sucesso!');
  console.log(`     Slug: sabor-da-terra`);
  console.log(`     ${6 + 4 + 4 + 3 + 3 + 6} itens de cardápio`);
  console.log(`     ${restCustomers.length} clientes`);
  console.log(`     ${restOrders.length} pedidos\n`);

  // ============================================================
  // RESUMO FINAL
  // ============================================================
  console.log('═══════════════════════════════════════════════');
  console.log('  DEMOS PRONTAS! 🎉');
  console.log('═══════════════════════════════════════════════\n');
  console.log('  🍕 Pizzaria do Mario');
  console.log('     Cardápio: menu.pedirei.online/pizzaria-do-mario');
  console.log('     Admin:    admin.pedirei.online');
  console.log('     Login:    demo-pizzaria@pedirei.online / demo1234\n');
  console.log('  🍽️  Restaurante Sabor da Terra');
  console.log('     Cardápio: menu.pedirei.online/sabor-da-terra');
  console.log('     Admin:    admin.pedirei.online');
  console.log('     Login:    demo-restaurante@pedirei.online / demo1234\n');
  console.log('  📱 WhatsApp: Acesse o admin de cada loja e');
  console.log('     conecte escaneando o QR Code na aba WhatsApp.\n');
}

seedDemos()
  .catch((e) => {
    console.error('❌ Erro ao criar demos:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
