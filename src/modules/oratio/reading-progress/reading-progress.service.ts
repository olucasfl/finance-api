import { Injectable } from '@nestjs/common';
import { ReadingKind } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ReadingProgressService {

  constructor(private prisma: PrismaService) {}

  // Grava/atualiza a última posição de leitura de uma frente (Bíblia ou
  // Catecismo). Uma linha por (usuário, tipo) — o unique cuida do upsert.
  async save(
    userId: string,
    kind: ReadingKind,
    reference: string,
    label: string
  ) {

    return this.prisma.readingProgress.upsert({
      where: { userId_kind: { userId, kind } },
      update: { reference, label },
      create: { userId, kind, reference, label }
    });

  }

  async list(userId: string) {

    return this.prisma.readingProgress.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' }
    });

  }

  async findOne(userId: string, kind: ReadingKind) {

    return this.prisma.readingProgress.findUnique({
      where: { userId_kind: { userId, kind } }
    });

  }

}
