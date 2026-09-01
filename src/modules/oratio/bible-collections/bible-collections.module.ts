import { Module } from '@nestjs/common';
import { BibleCollectionsService } from './bible-collections.service';
import { BibleCollectionsController } from './bible-collections.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [BibleCollectionsController],
  providers: [BibleCollectionsService, PrismaService],
  exports: [BibleCollectionsService],
})
export class BibleCollectionsModule {}
