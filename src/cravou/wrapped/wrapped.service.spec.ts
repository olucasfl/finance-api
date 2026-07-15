import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma/prisma.service';
import { WrappedService } from './wrapped.service';

describe('WrappedService', () => {
  let service: WrappedService;
  let store: {
    id: string;
    status: string;
    previewUserId: string | null;
    activatedAt: Date | null;
  } | null;

  let predictionsFixture: { userId: string; points: number | null }[];

  beforeEach(async () => {
    store = null;
    predictionsFixture = [];

    const prismaMock = {
      cravouWrappedConfig: {
        upsert: jest.fn(async ({ update, create }: any) => {
          if (!store) {
            store = { id: 'singleton', status: 'off', previewUserId: null, activatedAt: null, ...create };
          } else {
            store = { ...store, ...update };
          }
          return store;
        }),
      },
      cravouPrediction: {
        findMany: jest.fn(async () => predictionsFixture.filter((p) => p.points !== null)),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [WrappedService, { provide: PrismaService, useValue: prismaMock }],
    }).compile();

    service = module.get<WrappedService>(WrappedService);
  });

  it('nao esta visivel pra ninguem no estado inicial (off)', async () => {
    const status = await service.getStatusFor('user-a');
    expect(status).toEqual({ active: false, activatedAt: null });
  });

  it('previa: fica visivel apenas para quem ativou', async () => {
    await service.activatePreview('user-a');

    expect((await service.getStatusFor('user-a')).active).toBe(true);
    expect((await service.getStatusFor('user-b')).active).toBe(false);
  });

  it('release: fica visivel para qualquer usuario e reseta o previewUserId', async () => {
    await service.activatePreview('user-a');
    await service.release();

    expect((await service.getStatusFor('user-a')).active).toBe(true);
    expect((await service.getStatusFor('user-b')).active).toBe(true);
  });

  it('release renova o activatedAt em relacao a previa (para resetar o "ja vi")', async () => {
    const preview = await service.activatePreview('user-a');
    await new Promise((r) => setTimeout(r, 5));
    const released = await service.release();

    expect(released.activatedAt).not.toEqual(preview.activatedAt);
  });

  it('deactivate volta tudo para invisivel e limpa o previewUserId', async () => {
    await service.activatePreview('user-a');
    await service.release();
    const status = await service.deactivate();

    expect(status).toEqual({ active: false, activatedAt: null });
    expect((await service.getStatusFor('user-a')).active).toBe(false);
  });

  it('reativar a previa depois de desativar gera um activatedAt novo', async () => {
    const first = await service.activatePreview('user-a');
    await service.deactivate();
    await new Promise((r) => setTimeout(r, 5));
    const second = await service.activatePreview('user-a');

    expect(second.activatedAt).not.toEqual(first.activatedAt);
  });

  describe('getComparison', () => {
    it('retorna 0 quando ninguem tem palpite pontuado', async () => {
      predictionsFixture = [];
      expect(await service.getComparison()).toEqual({ avgAprovPct: 0 });
    });

    it('calcula a media simples do aproveitamento por usuario (nao pondera por volume)', async () => {
      predictionsFixture = [
        // user-a: 2 de 2 pontuaram (100%)
        { userId: 'user-a', points: 10 },
        { userId: 'user-a', points: 5 },
        // user-b: 1 de 4 pontuou (25%) — tem mais palpites, mas conta igual no calculo da media
        { userId: 'user-b', points: 10 },
        { userId: 'user-b', points: 0 },
        { userId: 'user-b', points: 0 },
        { userId: 'user-b', points: 0 },
      ];
      // media simples: (100 + 25) / 2 = 62.5 -> arredonda pra 63
      expect(await service.getComparison()).toEqual({ avgAprovPct: 63 });
    });

    it('ignora palpites ainda nao processados (points null)', async () => {
      predictionsFixture = [
        { userId: 'user-a', points: 10 },
        { userId: 'user-a', points: null },
      ];
      expect(await service.getComparison()).toEqual({ avgAprovPct: 100 });
    });
  });
});
