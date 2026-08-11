import { Module } from '@nestjs/common';
import { ReadingProgressService } from './reading-progress.service';
import { ReadingProgressController } from './reading-progress.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [ReadingProgressController],
  providers: [ReadingProgressService, PrismaService],
  exports: [ReadingProgressService],
})
export class ReadingProgressModule {}
