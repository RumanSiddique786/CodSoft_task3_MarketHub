import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { OrdersService } from './orders.service';

@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Post()
  create(@Req() req, @Body() body: { shippingAddr: string; items: { productId: string; quantity: number }[] }) {
    return this.ordersService.create(req.user.userId, body.shippingAddr, body.items);
  }

  @Get('mine')
  myOrders(@Req() req) {
    return this.ordersService.findMyOrders(req.user.userId);
  }

  @UseGuards(RolesGuard)
  @Roles('VENDOR')
  @Get('vendor')
  vendorOrders(@Req() req) {
    return this.ordersService.findVendorOrders(req.user.userId);
  }

  @UseGuards(RolesGuard)
  @Roles('VENDOR')
  @Patch('item/:id/status')
  updateItemStatus(@Req() req, @Param('id') id: string, @Body('status') status: string) {
    return this.ordersService.updateItemStatus(req.user.userId, id, status);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Get('admin/all')
  allForAdmin() {
    return this.ordersService.findAllForAdmin();
  }
  // Orders are now marked PAID only via the Stripe webhook (see PaymentsController) —
  // never trust a client-callable endpoint to confirm payment.
}
