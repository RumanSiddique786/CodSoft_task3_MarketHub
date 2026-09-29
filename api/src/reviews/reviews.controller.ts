import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReviewsService } from './reviews.service';

@UseGuards(JwtAuthGuard)
@Controller('reviews')
export class ReviewsController {
  constructor(private reviewsService: ReviewsService) {}

  @Post()
  create(@Req() req, @Body() body: { productId: string; rating: number; comment?: string }) {
    return this.reviewsService.create(req.user.userId, body.productId, body.rating, body.comment);
  }
}
