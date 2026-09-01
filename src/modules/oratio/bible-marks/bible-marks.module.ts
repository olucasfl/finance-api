import { Module } from '@nestjs/common';
import { BibleMarksService } from './bible-marks.service';
import { BibleMarksController } from './bible-marks.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [BibleMarksController],
  providers: [BibleMarksService, PrismaService],
  exports: [BibleMarksService],
})
export class BibleMarksModule {}
