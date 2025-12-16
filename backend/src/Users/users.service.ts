import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dtos/createuser.dto';
import { UpdateUserDto } from './dtos/updateuser.dto';
import { UserResponseDto } from './dtos/user-response.dto';
import { ApiResponse } from '../common/interfaces/api-response.interface';
import { PaginationOptions } from '../common/interfaces/pagination-options.interface';
import * as bcrypt from 'bcryptjs';
import { LoginDto } from './dtos/logindto';
import { Prisma, UserRole } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private sanitizeUser(user: Record<string, any>): UserResponseDto {
    const { password, ...rest } = user;
    return rest as UserResponseDto;
  }

  async create(data: CreateUserDto): Promise<ApiResponse<UserResponseDto>> {
    if (data.role === UserRole.ADMIN) {
      throw new ForbiddenException('Admin users can not be created');
    }

    if (!data.password) {
      throw new BadRequestException('Password is required');
    }

    if (data.password.length < 8) {
      throw new BadRequestException(
        'Password must be at least 8 characters long',
      );
    }

    if (data.role && !Object.values(UserRole).includes(data.role)) {
      throw new BadRequestException('Invalid role provided');
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);

    try {
      const user = await this.prisma.user.create({
        data: {
          name: data.name,
          email: data.email,
          password: hashedPassword,
          role: data.role ?? UserRole.USER,
        },
      });

      return {
        success: true,
        message: 'User created successfully',
        data: this.sanitizeUser(user),
      };
    } catch (error) {
      throw new BadRequestException('Failed to create user');
    }
  }

  async findAll(
    options: PaginationOptions = {},
  ): Promise<ApiResponse<UserResponseDto[]>> {
    const { page = 1, limit = 10 } = options;
    const skip = (page - 1) * limit;

    const [users] = await Promise.all([
      this.prisma.user.findMany({
        where: { isActive: true },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where: { isActive: true } }),
    ]);

    return {
      success: true,
      message: 'Users retrieved successfully',
      data: users.map((user) => this.sanitizeUser(user)),
    };
  }

  async findActive(
    options: PaginationOptions = {},
  ): Promise<ApiResponse<UserResponseDto[]>> {
    return this.findAll(options);
  }

  async findByRole(
    role: UserRole,
    options: PaginationOptions = {},
  ): Promise<ApiResponse<UserResponseDto[]>> {
    const { page = 1, limit = 10 } = options;
    const skip = (page - 1) * limit;

    const [users] = await Promise.all([
      this.prisma.user.findMany({
        where: {
          isActive: true,
          role,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({
        where: {
          isActive: true,
          role,
        },
      }),
    ]);

    return {
      success: true,
      message: 'Users retrieved successfully',
      data: users.map((user) => this.sanitizeUser(user)),
    };
  }

  async findOne(id: string): Promise<ApiResponse<UserResponseDto>> {
    if (!id) {
      throw new BadRequestException('User ID is required');
    }

    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user || !user.isActive) {
      throw new NotFoundException('User not found');
    }

    return {
      success: true,
      message: 'User retrieved successfully',
      data: this.sanitizeUser(user),
    };
  }

  async getById(id: string): Promise<ApiResponse<UserResponseDto>> {
    return this.findOne(id);
  }

  async findByEmail(email: string): Promise<UserResponseDto | null> {
    if (!email) {
      throw new BadRequestException('Email is required');
    }

    const user = await this.prisma.user.findUnique({
      where: { email, isActive: true },
    });

    return user ? this.sanitizeUser(user) : null;
  }

  async update(
    id: string,
    data: UpdateUserDto,
  ): Promise<ApiResponse<UserResponseDto>> {
    if (!id) {
      throw new BadRequestException('User ID is required');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser || !existingUser.isActive) {
      throw new NotFoundException('User not found');
    }

    const hasNoChanges = Object.keys(data).every((key) => {
      return existingUser[key] === data[key];
    });

    if (hasNoChanges) {
      throw new BadRequestException('No changes detected');
    }

    const updateData: Prisma.UserUpdateInput = {
      ...data,
      updatedAt: new Date(),
    };

    try {
      const updatedUser = await this.prisma.user.update({
        where: { id },
        data: updateData,
      });

      return {
        success: true,
        message: 'User updated successfully',
        data: {
          ...this.sanitizeUser(updatedUser),
          profileImage: updatedUser.profileImage || undefined,
        },
      };
    } catch (error) {
      throw new BadRequestException('Failed to update user');
    }
  }

  async remove(id: string): Promise<ApiResponse<null>> {
    if (!id) {
      throw new BadRequestException('User ID is required');
    }

    try {
      const user = await this.prisma.user.findUnique({
        where: { id },
        include: {
          projects: true,
        },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      await this.prisma.$transaction(async (prisma) => {
        await prisma.project.updateMany({
          where: { assigneeId: id },
          data: { assigneeId: null },
        });

        await prisma.user.delete({
          where: { id },
        });
      });

      return {
        success: true,
        message: `User ${id} has been deleted successfully!`,
        data: null,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to delete user');
    }
  }

  async login(credentials: LoginDto): Promise<ApiResponse<UserResponseDto>> {
    const { email, password } = credentials;

    if (!email || !password) {
      throw new BadRequestException('Email and password are required');
    }

    const user = await this.prisma.user.findUnique({
      where: { email, isActive: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return {
      success: true,
      message: 'Login successful',
      data: this.sanitizeUser(user),
    };
  }
}
