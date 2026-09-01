import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AddBibleCollectionItemDto } from './dto/add-bible-collection-item.dto';

function normalizeNote(note: string | null | undefined): string | null {
  if (note === null || note === undefined) return null;
  const trimmed = note.trim();
  return trimmed.length ? trimmed : null;
}

@Injectable()
export class BibleCollectionsService {
  constructor(private prisma: PrismaService) {}

  async list(userId: string) {
    return this.prisma.bibleCollection.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { items: true } } },
    });
  }

  async create(userId: string, name: string) {
    return this.prisma.bibleCollection.create({
      data: { userId, name: name.trim() },
    });
  }

  async rename(userId: string, id: string, name: string) {
    await this.ensureOwned(userId, id);

    return this.prisma.bibleCollection.update({
      where: { id },
      data: { name: name.trim() },
    });
  }

  async remove(userId: string, id: string) {
    await this.ensureOwned(userId, id);
    await this.prisma.bibleCollection.delete({ where: { id } });
    return { deleted: true };
  }

  async get(userId: string, id: string) {
    const collection = await this.prisma.bibleCollection.findFirst({
      where: { id, userId },
      include: { items: { orderBy: { createdAt: 'asc' } } },
    });

    if (!collection) {
      throw new NotFoundException('Coleção não encontrada');
    }

    return collection;
  }

  async addItem(userId: string, collectionId: string, dto: AddBibleCollectionItemDto) {
    await this.ensureOwned(userId, collectionId);

    const { book, chapter, verse, reference, text } = dto;
    const note = normalizeNote(dto.note);

    return this.prisma.bibleCollectionItem.upsert({
      where: {
        collectionId_book_chapter_verse: { collectionId, book, chapter, verse },
      },
      update: { reference, text, note },
      create: { collectionId, book, chapter, verse, reference, text, note },
    });
  }

  async removeItem(userId: string, collectionId: string, itemId: string) {
    await this.ensureOwned(userId, collectionId);

    const item = await this.prisma.bibleCollectionItem.findFirst({
      where: { id: itemId, collectionId },
    });

    if (!item) {
      throw new NotFoundException('Item não encontrado');
    }

    await this.prisma.bibleCollectionItem.delete({ where: { id: itemId } });
    return { deleted: true };
  }

  // Coleção inexistente OU de outro usuário caem no mesmo 404 — não
  // vaza se o id existe (mesmo padrão do VoxAiService.deleteConversation).
  private async ensureOwned(userId: string, id: string) {
    const found = await this.prisma.bibleCollection.findFirst({
      where: { id, userId },
      select: { id: true },
    });

    if (!found) {
      throw new NotFoundException('Coleção não encontrada');
    }
  }
}
