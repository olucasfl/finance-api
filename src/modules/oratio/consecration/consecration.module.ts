import { Module } from '@nestjs/common';
import { ConsecrationController } from './consecration.controller';
import { ConsecrationService } from './consecration.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [ConsecrationController],
  providers: [ConsecrationService, PrismaService],
})
export class ConsecrationModule {}