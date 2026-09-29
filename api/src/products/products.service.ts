import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  // Public storefront listing: search + category filter + pagination
  async findAll(params: { search?: string; categoryId?: string; page?: number; limit?: number }) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 12;

    const where: any = { isActive: true };
    if (params.categoryId) where.categoryId = params.categoryId;
    if (params.search) {
      where.title = { contains: params.search, mode: 'insensitive' };
    }

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: { vendor: { select: { storeName: true } }, category: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    return { items, total, page, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        vendor: { select: { storeName: true, id: true } },
        category: true,
        reviews: { include: { user: { select: { name: true } } } },
      },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  // Vendor-scoped: only returns/affects the calling vendor's own products
  async findMine(userId: string) {
    const vendor = await this.getVendorOrThrow(userId);
    return this.prisma.product.findMany({ where: { vendorId: vendor.id } });
  }

  async create(userId: string, dto: CreateProductDto) {
    const vendor = await this.getVendorOrThrow(userId);
    if (vendor.status !== 'APPROVED') {
      throw new ForbiddenException('Vendor is not approved yet — wait for admin approval');
    }
    return this.prisma.product.create({
      data: { ...dto, vendorId: vendor.id, images: dto.images ?? [] },
    });
  }

  async update(userId: string, productId: string, dto: UpdateProductDto) {
    const vendor = await this.getVendorOrThrow(userId);
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');
    if (product.vendorId !== vendor.id) {
      throw new ForbiddenException('You do not own this product');
    }
    return this.prisma.product.update({ where: { id: productId }, data: dto });
  }

  async remove(userId: string, productId: string) {
    const vendor = await this.getVendorOrThrow(userId);
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');
    if (product.vendorId !== vendor.id) {
      throw new ForbiddenException('You do not own this product');
    }
    return this.prisma.product.delete({ where: { id: productId } });
  }

  private async getVendorOrThrow(userId: string) {
    const vendor = await this.prisma.vendor.findUnique({ where: { userId } });
    if (!vendor) throw new ForbiddenException('No vendor profile for this user');
    return vendor;
  }
}
