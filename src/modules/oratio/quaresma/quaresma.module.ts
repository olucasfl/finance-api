import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ActivityModule } from '../activity/activity.module';
import { QuaresmaController } from './quaresma.controller';
import { QuaresmaService } from './quaresma.service';

@Module({
  imports: [ActivityModule],
  controllers: [QuaresmaController],
  providers: [QuaresmaService, PrismaService],
  exports: [QuaresmaService],
})
export class QuaresmaModule {}
