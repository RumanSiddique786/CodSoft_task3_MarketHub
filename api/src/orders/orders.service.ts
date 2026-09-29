import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface CreateOrderItemInput {
  productId: string;
  quantity: number;
}

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  // Core marketplace logic: one checkout -> one Order -> many OrderItems,
  // each tagged with its own vendorId so vendors fulfill independently.
  async create(customerId: string, shippingAddr: string, items: CreateOrderItemInput[]) {
    if (!items?.length) throw new BadRequestException('Cart is empty');

    return this.prisma.$transaction(async (tx) => {
      let totalAmount = 0;
      const orderItemsData: any[] = [];

      for (const item of items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) throw new NotFoundException(`Product ${item.productId} not found`);
        if (product.stock < item.quantity) {
          throw new BadRequestException(`Insufficient stock for "${product.title}"`);
        }

        const lineTotal = Number(product.price) * item.quantity;
        totalAmount += lineTotal;

        orderItemsData.push({
          productId: product.id,
          vendorId: product.vendorId,
          quantity: item.quantity,
          priceAtSale: product.price,
        });

        // Decrement stock immediately (simple approach — good enough for demo scale)
        await tx.product.update({
          where: { id: product.id },
          data: { stock: { decrement: item.quantity } },
        });
      }

      const order = await tx.order.create({
        data: {
          customerId,
          shippingAddr,
          totalAmount,
          status: 'PENDING',
          items: { create: orderItemsData },
        },
        include: { items: true },
      });

      return order;
    });
  }

  // Called after payment gateway confirms payment (webhook) — see payments notes in README
  async markPaid(orderId: string, paymentId: string) {
    return this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'PAID', paymentId, items: { updateMany: { where: {}, data: { status: 'PAID' } } } },
    });
  }

  findMyOrders(customerId: string) {
    return this.prisma.order.findMany({
      where: { customerId },
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Vendor sees only the OrderItems that belong to them, not the whole order
  async findVendorOrders(userId: string) {
    const vendor = await this.prisma.vendor.findUnique({ where: { userId } });
    if (!vendor) throw new ForbiddenException('No vendor profile for this user');

    return this.prisma.orderItem.findMany({
      where: { vendorId: vendor.id },
      include: { product: true, order: { select: { shippingAddr: true, createdAt: true, customerId: true } } },
      orderBy: { id: 'desc' },
    });
  }

  // Vendor updates the status of THEIR item only (e.g. PROCESSING -> SHIPPED)
  async updateItemStatus(userId: string, orderItemId: string, status: string) {
    const vendor = await this.prisma.vendor.findUnique({ where: { userId } });
    if (!vendor) throw new ForbiddenException('No vendor profile for this user');

    const item = await this.prisma.orderItem.findUnique({ where: { id: orderItemId } });
    if (!item) throw new NotFoundException('Order item not found');
    if (item.vendorId !== vendor.id) throw new ForbiddenException('Not your order item');

    return this.prisma.orderItem.update({
      where: { id: orderItemId },
      data: { status: status as any },
    });
  }

  // Admin: platform-wide view
  findAllForAdmin() {
    return this.prisma.order.findMany({
      include: { items: true, customer: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
}
