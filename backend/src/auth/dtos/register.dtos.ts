/* eslint-disable @typescript-eslint/no-unsafe-call */
import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

export enum UserRole {
  GUEST = 'GUEST',
  STAFF = 'STAFF',
  MANAGER = 'MANAGER',
  ADMIN = 'ADMIN',
}

export class RegisterDto {
  @IsEmail({}, { message: 'please provide a valid email adress' })
  email!: string;

  @IsNotEmpty({ message: 'password is required' })
  @MinLength(6, { message: 'password must be 6 characters long' })
  password!: string;

  @IsNotEmpty({ message: 'name is required' })
  @IsNotEmpty({ message: 'name is reguired' })
  name!: string;
}
