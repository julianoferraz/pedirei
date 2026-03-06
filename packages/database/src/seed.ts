import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create Plans
  const plans = [
    {
      name: 'Gratuito',
      slug: 'gratuito',
      maxOrdersMonth: 30,
      maxOperators: 1,
      price: 0,
      hasReports: false,
      hasAdvReports: false,
      hasNfce: false,
      hasPrinting: false,
      hasRepeatOrder: false,
      hasPhotoImport: false,
      hasWhatsappCmd: false,
      hasCustomDomain: false,
      hasCashRegister: false,
      hasLoyalty: false,
      hasKds: false,
      hasTableOrder: false,
      hasSalesRecovery: false,
      hasMarketingPixels: false,
      hasAiSuggestions: false,
      hasBulkWhatsapp: false,
      hasDeliveryApp: false,
      hasMultiUnit: false,
      hasBranding: true,
    },
    {
      name: 'Essencial',
      slug: 'essencial',
      maxOrdersMonth: 300,
      maxOperators: 2,
      price: 69.9,
      hasReports: true,
      hasAdvReports: false,
      hasNfce: false,
      hasPrinting: false,
      hasRepeatOrder: false,
      hasPhotoImport: true,
      hasWhatsappCmd: true,
      hasCustomDomain: false,
      hasCashRegister: false,
      hasLoyalty: true,
      hasKds: false,
      hasTableOrder: false,
      hasSalesRecovery: true,
      hasMarketingPixels: false,
      hasAiSuggestions: false,
      hasBulkWhatsapp: true,
      hasDeliveryApp: false,
      hasMultiUnit: false,
      hasBranding: false,
    },
    {
      name: 'Profissional',
      slug: 'profissional',
      maxOrdersMonth: 1000,
      maxOperators: -1,
      price: 129.9,
      hasReports: true,
      hasAdvReports: true,
      hasNfce: true,
      hasPrinting: true,
      hasRepeatOrder: true,
      hasPhotoImport: true,
      hasWhatsappCmd: true,
      hasCustomDomain: false,
      hasCashRegister: true,
      hasLoyalty: true,
      hasKds: true,
      hasTableOrder: true,
      hasSalesRecovery: true,
      hasMarketingPixels: true,
      hasAiSuggestions: true,
      hasBulkWhatsapp: true,
      hasDeliveryApp: true,
      hasMultiUnit: false,
      hasBranding: false,
    },
    {
      name: 'Negócio',
      slug: 'negocio',
      maxOrdersMonth: -1,
      maxOperators: -1,
      price: 199.9,
      hasReports: true,
      hasAdvReports: true,
      hasNfce: true,
      hasPrinting: true,
      hasRepeatOrder: true,
      hasPhotoImport: true,
      hasWhatsappCmd: true,
      hasCustomDomain: true,
      hasCashRegister: true,
      hasLoyalty: true,
      hasKds: true,
      hasTableOrder: true,
      hasSalesRecovery: true,
      hasMarketingPixels: true,
      hasAiSuggestions: true,
      hasBulkWhatsapp: true,
      hasDeliveryApp: true,
      hasMultiUnit: true,
      hasBranding: false,
    },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { slug: plan.slug },
      update: plan,
      create: plan,
    });
  }
  console.log('✅ Plans created');

  // Create Platform Config
  await prisma.platformConfig.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      defaultAiModel: 'gpt-4.1-mini',
      defaultAiProvider: 'openai',
    },
  });
  console.log('✅ Platform config created');

  // Create Master Admin
  const masterEmail = process.env.MASTER_EMAIL || 'admin@pedirei.online';
  const masterPassword = process.env.MASTER_PASSWORD || 'admin123456';
  const hashedPassword = await bcrypt.hash(masterPassword, 12);

  await prisma.masterAdmin.upsert({
    where: { email: masterEmail },
    update: { password: hashedPassword },
    create: {
      email: masterEmail,
      password: hashedPassword,
      name: 'Admin Master',
    },
  });
  console.log('✅ Master admin created');

  console.log('🎉 Seed completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
