// import { UserResponse } from './auth.interfaces';
// import { UserRole } from './dtos/register.dtos';
import { User, UserRole } from '@prisma/client';

export interface AuthReponse {
  name: any;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  role: UserRole;
  id: string;
  email: string;
  acces_token: string;
  User: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  };
}
export interface UserResponse {
  id: number;
  email: string;
  role: string;
  IsActive: boolean;
  CreatedAt: Date;
  UpdatedAt: Date;
}

export interface JwtPayLoad {
  userId: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

export interface JwtUser {
  userId: string;
  email: string;
  role: string;
}

export type AuthUser = Omit<User, 'password'>;
