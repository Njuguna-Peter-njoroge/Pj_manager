/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaClient, User, UserRole } from '@prisma/client';
import { RegisterDto } from './dtos/register.dtos';
import { AuthReponse, JwtPayLoad, UserResponse } from './auth.interfaces';
import * as bcrypt from 'bcrypt';
// import { access } from 'fs';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  private readonly prisma = new PrismaClient();
  constructor(private readonly jwtService: JwtService) {}

  async register(data: RegisterDto): Promise<AuthReponse> {
    const { email, name, password } = data;

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('user with email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await this.prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role: UserRole.USER,
        isActive: true,
      },
    });
    return this.generateAuthResponse(user);
  }
  private generateAuthResponse(user: User): AuthReponse {
    const PayLoad: JwtPayLoad = {
      email: user.email,
      userId: user.id,
      role: user.role,
      iat: Date.now(),
      exp: Date.now(),
    };

    const UserResponse: UserResponse = {
      id: Number(user.id),
      email: user.email,
      role: user.role,
      IsActive: user.isActive,
      CreatedAt: user.createdAt,
      UpdatedAt: user.updatedAt,
    };

    return {
      User: UserResponse,
      access_token: this.jwtService.sign(PayLoad),
    };
  }
}
