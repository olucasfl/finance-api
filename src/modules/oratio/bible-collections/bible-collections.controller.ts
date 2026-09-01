import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';

import { BibleCollectionsService } from './bible-collections.service';
import { CreateBibleCollectionDto } from './dto/create-bible-collection.dto';
import { RenameBibleCollectionDto } from './dto/rename-bible-collection.dto';
import { AddBibleCollectionItemDto } from './dto/add-bible-collection-item.dto';
import { JwtAuthGuard } from 'src/modules/auth/jwt-auth.guard';

@Controller('oratio/bible/collections')
@UseGuards(JwtAuthGuard)
export class BibleCollectionsController {
  constructor(private readonly service: BibleCollectionsService) {}

  @Get()
  list(@Req() req: any) {
    return this.service.list(req.user.userId);
  }

  @Post()
  create(@Req() req: any, @Body() body: CreateBibleCollectionDto) {
    return this.service.create(req.user.userId, body.name);
  }

  @Get(':id')
  get(@Req() req: any, @Param('id') id: string) {
    return this.service.get(req.user.userId, id);
  }

  @Patch(':id')
  rename(@Req() req: any, @Param('id') id: string, @Body() body: RenameBibleCollectionDto) {
    return this.service.rename(req.user.userId, id, body.name);
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.service.remove(req.user.userId, id);
  }

  @Post(':id/items')
  addItem(@Req() req: any, @Param('id') id: string, @Body() body: AddBibleCollectionItemDto) {
    return this.service.addItem(req.user.userId, id, body);
  }

  @Delete(':id/items/:itemId')
  removeItem(@Req() req: any, @Param('id') id: string, @Param('itemId') itemId: string) {
    return this.service.removeItem(req.user.userId, id, itemId);
  }
}
