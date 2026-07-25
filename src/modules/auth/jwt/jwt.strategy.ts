import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import config from '../../../config';
import { Role } from '@prisma/client';
import { RedisService } from '../../redis/redis.service';

function extractJwtFromCookie(req: any) {
  if (req && req.cookies && req.cookies['access_token']) {
    return req.cookies['access_token'];
  }
  return null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private redisService: RedisService) {
    super({
      jwtFromRequest: extractJwtFromCookie,
      ignoreExpiration: false,
      secretOrKey: config.JWT_SECRET,
      passReqToCallback: true,
    });
  }

  async validate(req: any, payload: { sub: string; email: string; role: string; exp?: number }) {
    if (!payload) {
      throw new UnauthorizedException();
    }

    // Check the blacklist
    const token = extractJwtFromCookie(req);
    if (token && typeof token === 'string' && await this.redisService.isBlacklisted(token)) {
      throw new UnauthorizedException('Token has been revoked');
    }

    return { userId: payload.sub, email: payload.email, role: payload.role as Role };
  }
}