import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma/prisma.service';
import { LiturgicalCalendarService } from '../voxai/services/liturgical-calendar.service';
import { NotificationContextService } from './notification-context.service';

describe('NotificationContextService', () => {
  let service: NotificationContextService;
  let prisma: any;
  let liturgy: { getLiturgicalData: jest.Mock };

  beforeEach(async () => {
    prisma = { user: { findUnique: jest.fn().mockResolvedValue({ name: 'Lucas Farias Leandro' }) } };
    liturgy = { getLiturgicalData: jest.fn().mockResolvedValue({ liturgia: 'Santa Teresa de Ávila' }) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationContextService,
        { provide: PrismaService, useValue: prisma },
        { provide: LiturgicalCalendarService, useValue: liturgy },
      ],
    }).compile();

    service = module.get(NotificationContextService);
  });

  describe('varsIn', () => {
    it('finds only the context vars actually present', () => {
      expect(service.varsIn('Bom dia, {nome}! Hoje é {santo}.')).toEqual(['nome', 'santo']);
      expect(service.varsIn('Você parou em {label}')).toEqual([]);
    });
  });

  describe('resolve', () => {
    it('resolves {nome} to the user first name', async () => {
      await expect(service.resolve('u1', ['nome'])).resolves.toEqual({ nome: 'Lucas' });
    });

    it('resolves {santo} and {tempoLiturgico} from the cached liturgical data', async () => {
      const r = await service.resolve('u1', ['santo', 'tempoLiturgico']);
      expect(r).toEqual({ santo: 'Santa Teresa de Ávila', tempoLiturgico: 'Santa Teresa de Ávila' });
    });

    it('only queries what was asked for', async () => {
      await service.resolve('u1', ['nome']);
      expect(liturgy.getLiturgicalData).not.toHaveBeenCalled();
    });

    it('falls back to neutral text when the name is missing', async () => {
      prisma.user.findUnique.mockResolvedValue({ name: '   ' });
      await expect(service.resolve('u1', ['nome'])).resolves.toEqual({ nome: 'você' });
    });

    it('falls back to neutral text when the liturgy service is down', async () => {
      liturgy.getLiturgicalData.mockRejectedValue(new Error('api down'));
      await expect(service.resolve('u1', ['santo', 'tempoLiturgico'])).resolves.toEqual({
        santo: 'o santo de hoje',
        tempoLiturgico: 'este tempo litúrgico',
      });
    });

    it('never throws if the user lookup fails', async () => {
      prisma.user.findUnique.mockRejectedValue(new Error('db down'));
      await expect(service.resolve('u1', ['nome'])).resolves.toEqual({ nome: 'você' });
    });
  });
});
