import { Body, Controller, Headers, Post, RawBodyRequest, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('checkout-session')
  createCheckoutSession(@Req() req, @Body('orderId') orderId: string) {
    return this.paymentsService.createCheckoutSession(orderId, req.user.userId);
  }

  // Fallback path used by the success page — see comment in PaymentsService.verifySession
  @UseGuards(JwtAuthGuard)
  @Post('verify-session')
  verifySession(@Req() req, @Body('sessionId') sessionId: string) {
    return this.paymentsService.verifySession(sessionId, req.user.userId);
  }

  // NOTE: this route receives the RAW request body (configured in main.ts),
  // not JSON — required so Stripe's signature check can verify it byte-for-byte.
  @Post('webhook')
  handleWebhook(@Req() req: RawBodyRequest<Request>, @Headers('stripe-signature') signature: string) {
    return this.paymentsService.handleWebhook(req.body as any, signature);
  }
}
