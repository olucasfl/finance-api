import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { VoxAiService } from './voxai.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { VoxRateLimiter } from './guards/vox.rate-limiter';
import { LiturgicalCalendarService } from './services/liturgical-calendar.service';
import { ActivityService } from '../activity/activity.service';

describe('VoxAiService', () => {
  let service: VoxAiService;
  let prisma: {
    conversation: { findUnique: jest.Mock; update: jest.Mock; delete: jest.Mock };
    message: { deleteMany: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      conversation: {
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      message: {
        deleteMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VoxAiService,
        { provide: PrismaService, useValue: prisma },
        { provide: VoxRateLimiter, useValue: {} },
        { provide: LiturgicalCalendarService, useValue: {} },
        { provide: ActivityService, useValue: {} },
      ],
    }).compile();

    service = module.get<VoxAiService>(VoxAiService);
  });

  describe('deleteConversation', () => {
    it('throws NotFoundException (not a raw 500) when the conversation belongs to someone else', async () => {
      prisma.conversation.findUnique.mockResolvedValue({ id: 'c1', userId: 'other-user' });

      await expect(
        service.deleteConversation('user-1', 'c1'),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(prisma.conversation.delete).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the conversation does not exist', async () => {
      prisma.conversation.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteConversation('user-1', 'missing'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('renameConversation', () => {
    it('throws NotFoundException when the conversation belongs to someone else', async () => {
      prisma.conversation.findUnique.mockResolvedValue({ id: 'c1', userId: 'other-user' });

      await expect(
        service.renameConversation('user-1', 'c1', 'Novo título'),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(prisma.conversation.update).not.toHaveBeenCalled();
    });
  });
});
