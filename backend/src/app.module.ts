import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [PrismaModule, DatabaseModule, AuthModule],
  controllers: [AppController],
  providers: [AppService],
  exports: [],
})
export class AppModule {}
