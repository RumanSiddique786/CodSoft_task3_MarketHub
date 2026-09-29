import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Protects a route: requires a valid JWT access token in Authorization: Bearer <token>
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
