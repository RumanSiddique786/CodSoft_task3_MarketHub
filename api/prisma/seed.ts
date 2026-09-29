import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('password123', 10);

  // --- Admin ---
  const admin = await prisma.user.upsert({
    where: { email: 'admin@demo.com' },
    update: {},
    create: { email: 'admin@demo.com', password, name: 'Admin User', role: 'ADMIN' },
  });

  // --- Vendor ---
  const vendorUser = await prisma.user.upsert({
    where: { email: 'vendor@demo.com' },
    update: {},
    create: { email: 'vendor@demo.com', password, name: 'Vendor One', role: 'VENDOR' },
  });
  const vendor = await prisma.vendor.upsert({
    where: { userId: vendorUser.id },
    update: {},
    create: { userId: vendorUser.id, storeName: 'Vendor One Store', status: 'APPROVED' },
  });

  // --- Customer ---
  await prisma.user.upsert({
    where: { email: 'customer@demo.com' },
    update: {},
    create: { email: 'customer@demo.com', password, name: 'Demo Customer', role: 'CUSTOMER' },
  });

  // --- A second vendor, so the storefront shows products from multiple sellers ---
  const vendorUser2 = await prisma.user.upsert({
    where: { email: 'vendor2@demo.com' },
    update: {},
    create: { email: 'vendor2@demo.com', password, name: 'Vendor Two', role: 'VENDOR' },
  });
  const vendor2 = await prisma.vendor.upsert({
    where: { userId: vendorUser2.id },
    update: {},
    create: { userId: vendorUser2.id, storeName: 'Vendor Two Store', status: 'APPROVED' },
  });

  // --- Categories ---
  const electronics = await prisma.category.upsert({
    where: { name: 'Electronics' },
    update: {},
    create: { name: 'Electronics' },
  });
  const fashion = await prisma.category.upsert({
    where: { name: 'Fashion' },
    update: {},
    create: { name: 'Fashion' },
  });
  const home = await prisma.category.upsert({
    where: { name: 'Home & Kitchen' },
    update: {},
    create: { name: 'Home & Kitchen' },
  });

  // picsum.photos generates a stable placeholder image per seed string —
  // no account or API key needed, works identically to a real S3-hosted image URL.
  const img = (seed: string) => [`https://picsum.photos/seed/${seed}/500/500`];

  await prisma.product.createMany({
    data: [
      {
        vendorId: vendor.id, categoryId: electronics.id,
        title: 'Wireless Headphones', description: 'Noise-cancelling over-ear headphones with 30hr battery life',
        price: 2999, stock: 50, images: img('headphones'),
      },
      {
        vendorId: vendor.id, categoryId: electronics.id,
        title: 'Mechanical Keyboard', description: 'RGB backlit mechanical keyboard with hot-swappable switches',
        price: 4499, stock: 30, images: img('keyboard'),
      },
      {
        vendorId: vendor.id, categoryId: electronics.id,
        title: 'Wireless Mouse', description: 'Ergonomic wireless mouse with adjustable DPI',
        price: 1299, stock: 60, images: img('mouse'),
      },
      {
        vendorId: vendor.id, categoryId: electronics.id,
        title: '4K Webcam', description: 'Ultra HD webcam with auto-focus and built-in mic',
        price: 3499, stock: 25, images: img('webcam'),
      },
      {
        vendorId: vendor2.id, categoryId: fashion.id,
        title: 'Classic Leather Wallet', description: 'Genuine leather bifold wallet with RFID protection',
        price: 899, stock: 80, images: img('wallet'),
      },
      {
        vendorId: vendor2.id, categoryId: fashion.id,
        title: 'Canvas Backpack', description: 'Durable canvas backpack with laptop compartment',
        price: 1799, stock: 40, images: img('backpack'),
      },
      {
        vendorId: vendor2.id, categoryId: fashion.id,
        title: 'Aviator Sunglasses', description: 'UV-protected classic aviator sunglasses',
        price: 699, stock: 100, images: img('sunglasses'),
      },
      {
        vendorId: vendor2.id, categoryId: home.id,
        title: 'Ceramic Coffee Mug Set', description: 'Set of 4 handcrafted ceramic mugs',
        price: 999, stock: 45, images: img('mugs'),
      },
      {
        vendorId: vendor2.id, categoryId: home.id,
        title: 'Desk Organizer', description: 'Bamboo desk organizer with multiple compartments',
        price: 1199, stock: 35, images: img('organizer'),
      },
      {
        vendorId: vendor.id, categoryId: home.id,
        title: 'LED Desk Lamp', description: 'Adjustable LED desk lamp with 5 brightness levels',
        price: 1499, stock: 55, images: img('lamp'),
      },
    ],
    skipDuplicates: true,
  });

  console.log('Seed complete — 10 products across 2 vendors and 3 categories.');
  console.log('Login with: admin@demo.com / vendor@demo.com / vendor2@demo.com / customer@demo.com — password: password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
