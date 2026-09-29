import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VendorsService {
  constructor(private prisma: PrismaService) {}

  // Admin: list all vendors, optionally filter by status (?status=PENDING)
  findAll(status?: 'PENDING' | 'APPROVED' | 'SUSPENDED') {
    return this.prisma.vendor.findMany({
      where: status ? { status } : undefined,
      include: { user: { select: { name: true, email: true } } },
    });
  }

  findMine(userId: string) {
    return this.prisma.vendor.findUnique({
      where: { userId },
      include: { products: true },
    });
  }

  // Admin: approve or suspend a vendor
  async updateStatus(vendorId: string, status: 'APPROVED' | 'SUSPENDED') {
    const vendor = await this.prisma.vendor.findUnique({ where: { id: vendorId } });
    if (!vendor) throw new NotFoundException('Vendor not found');
    return this.prisma.vendor.update({ where: { id: vendorId }, data: { status } });
  }

  // Admin: set a vendor's commission percentage
  async setCommission(vendorId: string, commissionPct: number) {
    return this.prisma.vendor.update({ where: { id: vendorId }, data: { commissionPct } });
  }

  // Simple sales summary for a vendor's own dashboard
  async salesSummary(userId: string) {
    const vendor = await this.prisma.vendor.findUnique({ where: { userId } });
    if (!vendor) throw new NotFoundException('Vendor profile not found');

    const items = await this.prisma.orderItem.findMany({
      where: { vendorId: vendor.id },
    });

    const totalRevenue = items.reduce(
      (sum, i) => sum + Number(i.priceAtSale) * i.quantity,
      0,
    );
    const totalOrders = new Set(items.map((i) => i.orderId)).size;
    const netAfterCommission = totalRevenue * (1 - vendor.commissionPct / 100);

    return { totalRevenue, totalOrders, commissionPct: vendor.commissionPct, netAfterCommission };
  }
}
