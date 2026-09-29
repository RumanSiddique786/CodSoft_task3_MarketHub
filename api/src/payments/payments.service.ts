import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';

@Injectable()
export class PaymentsService {
  private stripe: Stripe;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private ordersService: OrdersService,
  ) {
    this.stripe = new Stripe(this.config.get('STRIPE_SECRET_KEY')!, {
      apiVersion: '2024-04-10',
    });
  }

  // Called by the frontend right after an order is created (status PENDING).
  // Builds a Stripe Checkout Session priced from OUR database (never trust client-sent prices)
  // and returns the URL the customer should be redirected to.
  async createCheckoutSession(orderId: string, customerId: string, origin?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { product: true } } },
    });

    if (!order) throw new NotFoundException('Order not found');
    if (order.customerId !== customerId) throw new ForbiddenException('Not your order');
    if (order.status !== 'PENDING') throw new BadRequestException('Order is not payable');

    const frontendUrl = this.config.get('FRONTEND_URL') || 'http://localhost:3000';

    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = order.items.map((item) => ({
      price_data: {
        currency: 'inr',
        product_data: { name: item.product.title },
        // Stripe wants the smallest currency unit (paise for INR)
        unit_amount: Math.round(Number(item.priceAtSale) * 100),
      },
      quantity: item.quantity,
    }));

    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items,
      success_url: `${frontendUrl}/checkout/success?orderId=${order.id}&sessionId={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/checkout/cancel?orderId=${order.id}`,
      metadata: { orderId: order.id },
    });

    return { url: session.url };
  }

  // Fallback for local dev when webhook delivery is unreliable (e.g. a firewall
  // blocking the Stripe CLI's tunnel): instead of waiting for Stripe to PUSH an
  // event to us, directly ASK Stripe whether this specific session was paid.
  // This is a plain outbound HTTPS call — much less likely to be blocked than
  // the CLI's persistent tunnel connection. In production, the webhook remains
  // the source of truth; this just double-checks so the demo isn't blocked by
  // network issues on your end.
  async verifySession(sessionId: string, customerId: string) {
    const session = await this.stripe.checkout.sessions.retrieve(sessionId);
    const orderId = session.metadata?.orderId;
    if (!orderId) throw new NotFoundException('No order linked to this session');

    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.customerId !== customerId) throw new ForbiddenException('Not your order');

    if (session.payment_status === 'paid' && order.status === 'PENDING') {
      await this.ordersService.markPaid(orderId, session.payment_intent as string);
    }

    const refreshed = await this.prisma.order.findUnique({ where: { id: orderId } });
    return { status: refreshed?.status };
  }

  // Verifies the webhook actually came from Stripe (not a spoofed request),
  // then flips the order to PAID. This is the ONLY place an order should become PAID.
  async handleWebhook(rawBody: Buffer, signature: string) {
    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        this.config.get('STRIPE_WEBHOOK_SECRET')!,
      );
    } catch (err) {
      throw new BadRequestException(`Webhook signature verification failed: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.orderId;
      if (orderId) {
        await this.ordersService.markPaid(orderId, session.payment_intent as string);
      }
    }

    return { received: true };
  }
}
