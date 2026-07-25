import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { CreateUserDTO } from './dto/create-user.dto';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt'
import config from '../../config';
import type { Response } from 'express';
import { Role, type User } from "@prisma/client"
import { RedisService } from '../redis/redis.service';

@Injectable()
export class AuthService {
  constructor(
    private dbService: DbService,
    private jwtService: JwtService,
    private redisService: RedisService,
  ) { }

  private isAdminEmail(email: string): boolean {
    if (!config.ADMIN_EMAILS_WHITELIST || config.ADMIN_EMAILS_WHITELIST.length === 0) {
      console.warn('ADMIN_EMAILS_WHITELIST is empty or not configured');
      return false;
    }
    const normalizedEmail = email.toLowerCase().trim();
    return config.ADMIN_EMAILS_WHITELIST.some(whitelistEmail =>
      whitelistEmail.toLowerCase().trim() === normalizedEmail
    );
  }

  async validateUser(dto: CreateUserDTO): Promise<Omit<User, 'password'> | null> {
    const user = await this.dbService.user.findUnique({
      where: { email: dto.email }
    });
    if (user && await bcrypt.compare(dto.password, user.password)) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async createUser(dto: CreateUserDTO, response: Response) {
    const existing = await this.dbService.user.findUnique({
      where: { email: dto.email }
    });

    if (existing) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const role: Role = this.isAdminEmail(dto.email) ? Role.ADMIN : Role.USER;

    await this.dbService.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        role
      },
    });

    const user = await this.validateUser({ email: dto.email, password: dto.password });

    if (!user) {
      throw new UnauthorizedException('User email or password is invalid');
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    const token = this.jwtService.sign(payload);

    response.cookie('access_token', token, {
      httpOnly: true,
      secure: config.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 1000 * 60 * 60 * 24 * 7,
      path: '/',
    });

    return { message: 'User successfully registered', user };
  }

  async loginUser(dto: CreateUserDTO, response: Response) {
    const user = await this.validateUser(dto);

    if (!user) {
      throw new UnauthorizedException('User email or password is invalid');
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    const token = this.jwtService.sign(payload);

    response.cookie('access_token', token, {
      httpOnly: true,
      secure: config.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 1000 * 60 * 60 * 24 * 7,
      path: '/',
    });
    return { message: 'Logged in successfully' };
  }

  async logout(response: Response, token?: string) {
    // If a token was provided, add it to the blacklist
    if (token) {
      try {
        const decoded = this.jwtService.decode(token);
        if (decoded && typeof decoded === 'object' && 'exp' in decoded && decoded.exp) {
          const ttl = decoded.exp - Math.floor(Date.now() / 1000); // seconds until expiration
          if (ttl > 0) {
            await this.redisService.addToBlacklist(token, ttl);
          }
        }
      } catch (error) {
        // Ignore token decoding errors
        console.error('Error adding token to blacklist:', error);
      }
    }

    response.clearCookie('access_token', {
      sameSite: 'lax',
      httpOnly: true
    })

    return { message: 'Logged out successfully' }
  }
}
