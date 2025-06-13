import { AuthService } from './auth.service';
import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { RegisterDto } from './dtos/register.dtos';
import { AuthReponse } from './auth.interfaces';

@Controller('auth')
export class AuthController {
  constructor(private readonly AuthService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerDto: RegisterDto): Promise<AuthReponse> {
    return this.AuthService.register(registerDto);
  }
}
