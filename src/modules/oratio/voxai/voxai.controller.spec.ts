import { Test, TestingModule } from '@nestjs/testing';
import { VoxAiController } from './voxai.controller';
import { VoxAiService } from './voxai.service';
import { PrismaService } from 'src/prisma/prisma.service';

describe('VoxAiController', () => {
  let controller: VoxAiController;
  let voxAiService: {
    chat: jest.Mock;
    chatStream: jest.Mock;
    getBootstrap: jest.Mock;
    getOrCreateActiveConversation: jest.Mock;
    deleteConversation: jest.Mock;
    renameConversation: jest.Mock;
  };
  let prisma: {
    conversation: { findMany: jest.Mock; findUnique: jest.Mock };
    message: { findMany: jest.Mock };
  };

  const req = (userId: string) => ({ user: { userId } }) as any;

  beforeEach(async () => {
    voxAiService = {
      chat: jest.fn(),
      chatStream: jest.fn(),
      getBootstrap: jest.fn(),
      getOrCreateActiveConversation: jest.fn(),
      deleteConversation: jest.fn(),
      renameConversation: jest.fn(),
    };

    prisma = {
      conversation: { findMany: jest.fn(), findUnique: jest.fn() },
      message: { findMany: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [VoxAiController],
      providers: [
        { provide: VoxAiService, useValue: voxAiService },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    controller = module.get<VoxAiController>(VoxAiController);
  });

  it('chat() forwards the body and the userId from the request', async () => {
    voxAiService.chat.mockResolvedValue({ success: true, response: 'oi' });

    const result = await controller.chat(
      { message: 'oi', conversationId: 'c1' } as any,
      req('user-1'),
    );

    expect(voxAiService.chat).toHaveBeenCalledWith(
      { message: 'oi', conversationId: 'c1' },
      'user-1',
    );
    expect(result).toEqual({ success: true, response: 'oi' });
  });

  it('chatStream() forwards body, userId, req and res to the service', async () => {
    const res = {} as any;
    const request = { user: { userId: 'user-1' } } as any;

    await controller.chatStream({ message: 'oi', conversationId: 'c1' } as any, request, res);

    expect(voxAiService.chatStream).toHaveBeenCalledWith(
      { message: 'oi', conversationId: 'c1' },
      'user-1',
      request,
      res,
    );
  });

  it('getBootstrap() forwards the userId', async () => {
    voxAiService.getBootstrap.mockResolvedValue({ active: {}, conversations: [] });

    await controller.getBootstrap(req('user-1'));

    expect(voxAiService.getBootstrap).toHaveBeenCalledWith('user-1');
  });

  it('getActiveConversation() delegates to getOrCreateActiveConversation', async () => {
    voxAiService.getOrCreateActiveConversation.mockResolvedValue({ id: 'c1' });

    const result = await controller.getActiveConversation(req('user-1'));

    expect(voxAiService.getOrCreateActiveConversation).toHaveBeenCalledWith('user-1');
    expect(result).toEqual({ id: 'c1' });
  });

  it('createConversation() also delegates to getOrCreateActiveConversation (never creates a duplicate)', async () => {
    voxAiService.getOrCreateActiveConversation.mockResolvedValue({ id: 'c1' });

    await controller.createConversation(req('user-1'));

    expect(voxAiService.getOrCreateActiveConversation).toHaveBeenCalledWith('user-1');
  });

  it('getConversations() lists the caller\'s own conversations, newest first', async () => {
    prisma.conversation.findMany.mockResolvedValue([{ id: 'c1' }]);

    const result = await controller.getConversations(req('user-1'));

    expect(prisma.conversation.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      orderBy: { updatedAt: 'desc' },
    });
    expect(result).toEqual([{ id: 'c1' }]);
  });

  describe('getMessages()', () => {
    it("returns the conversation's messages in chronological order when the caller owns it", async () => {
      prisma.conversation.findUnique.mockResolvedValue({ id: 'c1', userId: 'user-1' });
      prisma.message.findMany.mockResolvedValue([{ id: 'm1' }]);

      const result = await controller.getMessages('c1', req('user-1'));

      expect(prisma.message.findMany).toHaveBeenCalledWith({
        where: { conversationId: 'c1' },
        orderBy: { createdAt: 'asc' },
      });
      expect(result).toEqual([{ id: 'm1' }]);
    });

    it('denies access when the conversation belongs to someone else', async () => {
      prisma.conversation.findUnique.mockResolvedValue({ id: 'c1', userId: 'other-user' });

      const result = await controller.getMessages('c1', req('user-1'));

      expect(result).toEqual({ error: 'Acesso negado' });
      expect(prisma.message.findMany).not.toHaveBeenCalled();
    });

    it('denies access when the conversation does not exist', async () => {
      prisma.conversation.findUnique.mockResolvedValue(null);

      const result = await controller.getMessages('missing', req('user-1'));

      expect(result).toEqual({ error: 'Acesso negado' });
    });
  });

  it('deleteConversation() forwards userId and conversation id', async () => {
    voxAiService.deleteConversation.mockResolvedValue({ id: 'new-active' });

    await controller.deleteConversation('c1', req('user-1'));

    expect(voxAiService.deleteConversation).toHaveBeenCalledWith('user-1', 'c1');
  });

  it('renameConversation() forwards userId, conversation id and the new title', async () => {
    voxAiService.renameConversation.mockResolvedValue({ id: 'c1', title: 'Novo título' });

    await controller.renameConversation('c1', 'Novo título', req('user-1'));

    expect(voxAiService.renameConversation).toHaveBeenCalledWith('user-1', 'c1', 'Novo título');
  });

});
