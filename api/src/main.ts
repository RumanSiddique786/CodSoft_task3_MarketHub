import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import * as express from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  // bodyParser: false — we set it up manually below so the Stripe webhook route
  // can receive the RAW, unparsed body (required for signature verification),
  // while every other route still gets normal JSON parsing.
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Disable Express's automatic ETag/304 caching. It's meant for static assets;
  // on a JSON API it causes the browser to silently serve a stale cached response
  // instead of hitting the server, which looks like "the data disappeared."
  app.getHttpAdapter().getInstance().disable('etag');

  app.enableCors({ origin: true, credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.setGlobalPrefix('api');
  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`MarketHub API running on http://localhost:${port}/api`);
}
bootstrap();
