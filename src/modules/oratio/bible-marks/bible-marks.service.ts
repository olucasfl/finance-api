import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpsertBibleMarkDto } from './dto/upsert-bible-mark.dto';

const DEFAULT_HIGHLIGHT_COLOR = 'amber';

// Nota vazia / só espaços conta como "sem nota" — é assim que o cliente
// apaga uma anotação (manda string vazia).
function normalizeNote(note: string | null | undefined): string | null {
  if (note === null || note === undefined) return null;
  const trimmed = note.trim();
  return trimmed.length ? trimmed : null;
}

@Injectable()
export class BibleMarksService {
  constructor(private prisma: PrismaService) {}

  // Lista os marks do usuário. Com `book` E `chapter`, restringe ao
  // capítulo (o que o BibliaChapter usa pra renderizar). Sem os dois,
  // devolve tudo (a tela "Minha Bíblia" divide e filtra no cliente).
  async list(userId: string, book?: string, chapter?: number) {
    const scoped = book && chapter ? { book, chapter } : {};

    return this.prisma.bibleMark.findMany({
      where: { userId, ...scoped },
      orderBy: { updatedAt: 'desc' },
    });
  }

  // Upsert de um mark. Campos ausentes no DTO preservam o valor atual
  // (merge parcial). Se depois do merge não sobra grifo, favorito nem
  // nota, a linha é apagada — não guardamos "linha vazia".
  async upsert(userId: string, dto: UpsertBibleMarkDto) {
    const { book, chapter, verse, reference, text } = dto;

    const where = {
      userId_book_chapter_verse: { userId, book, chapter, verse },
    };

    const existing = await this.prisma.bibleMark.findUnique({ where });

    // Mandar uma cor já liga o grifo, mesmo sem `highlighted` explícito.
    const highlighted =
      dto.highlighted ?? (dto.highlightColor ? true : (existing?.highlighted ?? false));

    const highlightColor = highlighted
      ? (dto.highlightColor ?? existing?.highlightColor ?? DEFAULT_HIGHLIGHT_COLOR)
      : null;

    const favorite = dto.favorite ?? existing?.favorite ?? false;
    const note = normalizeNote(dto.note !== undefined ? dto.note : (existing?.note ?? null));

    if (!highlighted && !favorite && !note) {
      if (existing) {
        await this.prisma.bibleMark.delete({ where });
      }
      return { deleted: true };
    }

    return this.prisma.bibleMark.upsert({
      where,
      update: { reference, text, highlighted, highlightColor, favorite, note },
      create: {
        userId,
        book,
        chapter,
        verse,
        reference,
        text,
        highlighted,
        highlightColor,
        favorite,
        note,
      },
    });
  }
}
