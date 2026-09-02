import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import axios from 'axios';
import { EventEmitter } from 'events';
import { VoxAiService } from './voxai.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { VoxRateLimiter } from './guards/vox.rate-limiter';
import { LiturgicalCalendarService } from './services/liturgical-calendar.service';
import { ActivityService } from '../activity/activity.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function aiResponse(content: string, usage: any = { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }) {
  return { data: { choices: [{ message: { content } }], usage } };
}

describe('VoxAiService', () => {
  let service: VoxAiService;
  let prisma: {
    conversation: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    message: { findMany: jest.Mock; findFirst: jest.Mock; deleteMany: jest.Mock; create: jest.Mock };
    user: { findUnique: jest.Mock; update: jest.Mock };
    $transaction: jest.Mock;
  };
  let rateLimiter: { check: jest.Mock };
  let liturgicalCalendarService: { getLiturgicalData: jest.Mock };
  let activityService: { log: jest.Mock };

  const ORIGINAL_ENV = process.env;

  // Sem valor padrão de propósito: um valor padrão em "apiKey?: string = 'test-key'"
  // seria aplicado mesmo passando `undefined` explicitamente, escondendo o caso
  // "chave não configurada" que este helper existe justamente pra simular.
  async function buildService(apiKey?: string) {
    process.env = { ...ORIGINAL_ENV };
    if (apiKey !== undefined) {
      process.env.OPENAI_API_KEY = apiKey;
    } else {
      delete process.env.OPENAI_API_KEY;
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VoxAiService,
        { provide: PrismaService, useValue: prisma },
        { provide: VoxRateLimiter, useValue: rateLimiter },
        { provide: LiturgicalCalendarService, useValue: liturgicalCalendarService },
        { provide: ActivityService, useValue: activityService },
      ],
    }).compile();

    return module.get<VoxAiService>(VoxAiService);
  }

  beforeEach(async () => {
    prisma = {
      conversation: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      message: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
        deleteMany: jest.fn(),
        create: jest.fn(),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({ voxProfile: null, voxOnboardingSeenAt: null }),
        update: jest.fn().mockResolvedValue({}),
      },
      $transaction: jest.fn().mockResolvedValue([]),
    };

    rateLimiter = { check: jest.fn().mockReturnValue({ allowed: true }) };
    liturgicalCalendarService = { getLiturgicalData: jest.fn().mockResolvedValue(null) };
    activityService = { log: jest.fn().mockResolvedValue(undefined) };

    prisma.conversation.findUnique.mockResolvedValue({
      id: 'c1',
      userId: 'user-1',
      hasMessages: false,
    });

    mockedAxios.post.mockReset();
    mockedAxios.post.mockResolvedValue(aiResponse('Resposta da IA'));

    service = await buildService('test-key');
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  describe('getOrCreateActiveConversation', () => {
    it('returns the existing conversation without messages instead of creating a new one', async () => {
      prisma.conversation.findFirst.mockResolvedValue({ id: 'existing', hasMessages: false });

      const result = await service.getOrCreateActiveConversation('user-1');

      expect(result).toEqual({ id: 'existing', hasMessages: false });
      expect(prisma.conversation.create).not.toHaveBeenCalled();
    });

    it('creates a fresh conversation when none without messages exists yet', async () => {
      prisma.conversation.findFirst.mockResolvedValue(null);
      prisma.conversation.create.mockResolvedValue({ id: 'new-c', title: 'Nova conversa' });

      const result = await service.getOrCreateActiveConversation('user-1');

      expect(prisma.conversation.create).toHaveBeenCalledWith({
        data: { userId: 'user-1', title: 'Nova conversa', hasMessages: false },
      });
      expect(result).toEqual({ id: 'new-c', title: 'Nova conversa' });
    });
  });

  describe('getBootstrap', () => {
    beforeEach(() => {
      prisma.conversation.findFirst.mockResolvedValue({ id: 'c1', hasMessages: false });
      prisma.conversation.findMany.mockResolvedValue([{ id: 'c1' }, { id: 'c2' }]);
    });

    it('returns the active conversation, the full list, the profile and the onboarding flag', async () => {
      prisma.user.findUnique.mockResolvedValue({ voxProfile: null, voxOnboardingSeenAt: null });

      const result = await service.getBootstrap('user-1');

      expect(result).toEqual({
        active: { id: 'c1', hasMessages: false },
        conversations: [{ id: 'c1' }, { id: 'c2' }],
        profile: null,
        showVoxIntro: true,
      });
    });

    it('reports the chosen profile and hides the intro once a profile is set', async () => {
      prisma.user.findUnique.mockResolvedValue({ voxProfile: 'STUDY', voxOnboardingSeenAt: new Date() });

      const result = await service.getBootstrap('user-1');

      expect(result).toMatchObject({ profile: 'STUDY', showVoxIntro: false });
    });

    it('hides the intro when the user dismissed it without choosing a profile', async () => {
      prisma.user.findUnique.mockResolvedValue({ voxProfile: null, voxOnboardingSeenAt: new Date() });

      const result = await service.getBootstrap('user-1');

      expect(result).toMatchObject({ profile: null, showVoxIntro: false });
    });
  });

  describe('listProfiles', () => {
    it('returns the six profiles without leaking systemAppend or maxTokens', () => {
      const profiles = service.listProfiles();

      expect(profiles.map((p) => p.key)).toEqual([
        'DEFAULT',
        'DIRECT',
        'STUDY',
        'PASTORAL',
        'CATECHIST',
        'APOLOGETIC',
      ]);
      for (const p of profiles) {
        expect(p).not.toHaveProperty('systemAppend');
        expect(p).not.toHaveProperty('maxTokens');
        expect(typeof p.label).toBe('string');
      }
    });
  });

  describe('setProfile', () => {
    it('stores the profile and stamps the onboarding-seen date', async () => {
      const result = await service.setProfile('user-1', 'PASTORAL');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { voxProfile: 'PASTORAL', voxOnboardingSeenAt: expect.any(Date) },
      });
      expect(result).toEqual({ profile: 'PASTORAL' });
    });
  });

  describe('markIntroSeen', () => {
    it('stamps the onboarding-seen date without touching the profile', async () => {
      const result = await service.markIntroSeen('user-1');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { voxOnboardingSeenAt: expect.any(Date) },
      });
      expect(result).toEqual({ ok: true });
    });
  });

  describe('chat', () => {
    it('returns the AI response on a normal message', async () => {
      const result = await service.chat({ message: 'Como rezar o terço?', conversationId: 'c1' } as any, 'user-1');

      expect(result).toEqual({ success: true, response: 'Resposta da IA' });
    });

    it('sends the system prompt, capped history and the final user message to OpenAI', async () => {
      // findMany is ordered createdAt:"desc" (newest first) — the service
      // reverses it back to chronological order, so the mock must be given
      // in desc order too: "Olá!" (assistant reply) is newer than "Oi".
      prisma.message.findMany.mockResolvedValue([
        { role: 'assistant', content: 'Olá!' },
        { role: 'user', content: 'Oi' },
      ]);

      await service.chat({ message: 'Tudo bem?', conversationId: 'c1' } as any, 'user-1');

      expect(prisma.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 6 }),
      );

      const [, payload] = mockedAxios.post.mock.calls[0];
      expect((payload as any).messages[0].role).toBe('system');
      expect((payload as any).messages.slice(1, -1)).toEqual([
        { role: 'user', content: 'Oi' },
        { role: 'assistant', content: 'Olá!' },
      ]);
      expect((payload as any).messages.at(-1)).toEqual({ role: 'user', content: 'Tudo bem?' });
      // DEFAULT profile budget (era 2000 fixo pra todos)
      expect((payload as any).max_tokens).toBe(1500);
    });

    it('builds the system prompt from the identity plus the active profile style block', async () => {
      await service.chat({ message: 'Oi', conversationId: 'c1' } as any, 'user-1');

      const [, payload] = mockedAxios.post.mock.calls[0];
      const systemContent = (payload as any).messages[0].content as string;

      expect(systemContent).toContain('# Identidade');
      expect(systemContent).toContain('# Estilo de resposta ativo: Padrão');
      // the style block is the last instruction in the prompt
      expect(systemContent.trimEnd().endsWith('a menos que a pergunta peça.')).toBe(true);
    });

    it('tags the token log with the active profile', async () => {
      const logSpy = jest.spyOn((service as any).logger, 'log').mockImplementation(() => undefined);

      await service.chat({ message: 'Oi', conversationId: 'c1' } as any, 'user-1');

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('profile=DEFAULT'));
    });

    it("applies the user's chosen profile to the system prompt and the token budget", async () => {
      prisma.user.findUnique.mockResolvedValue({ voxProfile: 'DIRECT' });
      const logSpy = jest.spyOn((service as any).logger, 'log').mockImplementation(() => undefined);

      await service.chat({ message: 'Oi', conversationId: 'c1' } as any, 'user-1');

      const [, payload] = mockedAxios.post.mock.calls[0];
      const systemContent = (payload as any).messages[0].content as string;
      expect(systemContent).toContain('# Estilo de resposta ativo: Direto ao ponto');
      expect((payload as any).max_tokens).toBe(600);
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('profile=DIRECT'));
    });

    it('falls back to DEFAULT when the stored profile key is unknown', async () => {
      prisma.user.findUnique.mockResolvedValue({ voxProfile: 'LEGACY_GARBAGE' });

      await service.chat({ message: 'Oi', conversationId: 'c1' } as any, 'user-1');

      const [, payload] = mockedAxios.post.mock.calls[0];
      expect((payload as any).max_tokens).toBe(1500);
    });

    it('persists both the user and assistant messages, and logs VoxAI activity', async () => {
      await service.chat({ message: 'Oi', conversationId: 'c1' } as any, 'user-1');

      expect(prisma.message.create).toHaveBeenCalledWith({
        data: { conversationId: 'c1', role: 'user', content: 'Oi' },
      });
      expect(prisma.message.create).toHaveBeenCalledWith({
        data: { conversationId: 'c1', role: 'assistant', content: 'Resposta da IA' },
      });
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(activityService.log).toHaveBeenCalledWith('user-1', 'VOX', 'Conversou com o Vox');
    });

    it('generates a title (first 5 words, punctuation stripped) on the first message of a conversation', async () => {
      await service.chat(
        { message: 'Posso rezar o terco hoje pela manha, obrigado!', conversationId: 'c1' } as any,
        'user-1',
      );

      const updateArgs = prisma.conversation.update.mock.calls[0][0];
      expect(updateArgs.data.title).toBe('Posso rezar o terco hoje');
      expect(updateArgs.data.hasMessages).toBe(true);
    });

    it('does not touch the title when the conversation already has messages', async () => {
      prisma.conversation.findUnique.mockResolvedValue({ id: 'c1', userId: 'user-1', hasMessages: true });

      await service.chat({ message: 'Mais uma pergunta', conversationId: 'c1' } as any, 'user-1');

      const updateArgs = prisma.conversation.update.mock.calls[0][0];
      expect(updateArgs.data.title).toBeUndefined();
    });

    it('rejects an empty message without calling OpenAI', async () => {
      const result = await service.chat({ message: '', conversationId: 'c1' } as any, 'user-1');

      expect(result).toEqual({ success: false, error: 'EMPTY_MESSAGE', message: 'Mensagem vazia.' });
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('rejects a message over 1000 characters without calling OpenAI', async () => {
      const result = await service.chat(
        { message: 'a'.repeat(1001), conversationId: 'c1' } as any,
        'user-1',
      );

      expect(result).toEqual({ success: false, error: 'MESSAGE_TOO_LONG', message: 'Mensagem muito longa.' });
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('rejects a message for a conversation that does not exist', async () => {
      prisma.conversation.findUnique.mockResolvedValue(null);

      const result = await service.chat({ message: 'Oi', conversationId: 'missing' } as any, 'user-1');

      expect(result).toEqual({ success: false, error: 'INVALID_CONVERSATION', message: 'Conversa inválida.' });
    });

    it('rejects a message for a conversation owned by someone else', async () => {
      prisma.conversation.findUnique.mockResolvedValue({ id: 'c1', userId: 'other-user', hasMessages: false });

      const result = await service.chat({ message: 'Oi', conversationId: 'c1' } as any, 'user-1');

      expect(result).toEqual({ success: false, error: 'FORBIDDEN', message: 'Conversa inválida.' });
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('returns a RATE_LIMIT result and skips OpenAI when the rate limiter blocks the request', async () => {
      rateLimiter.check.mockReturnValue({ allowed: false, message: 'Calma lá', retryAfterSeconds: 12 });

      const result = await service.chat({ message: 'Oi', conversationId: 'c1' } as any, 'user-1');

      expect(result).toEqual({
        success: false,
        error: 'RATE_LIMIT',
        message: 'Calma lá',
        retryAfterSeconds: 12,
      });
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('returns the content filter message directly without calling OpenAI or persisting anything', async () => {
      const result = await service.chat(
        { message: 'Qual é o meu horóscopo?', conversationId: 'c1' } as any,
        'user-1',
      );

      expect(result.success).toBe(true);
      expect(result.response).toContain('não posso orientar sobre esse tema');
      expect(mockedAxios.post).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('short-circuits with a holding message when the same message was just sent (double-submit)', async () => {
      prisma.message.findFirst.mockResolvedValue({ id: 'm1', content: 'Oi' });

      const result = await service.chat({ message: 'Oi', conversationId: 'c1' } as any, 'user-1');

      expect(result).toEqual({ success: true, response: 'Aguarde, processando sua última mensagem...' });
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('adds the liturgy section to the prompt when the message mentions liturgy and the local parser recognizes the date', async () => {
      liturgicalCalendarService.getLiturgicalData.mockResolvedValue({
        data: '2026-02-04',
        liturgia: 'Quarta-feira',
        cor: 'Verde',
        leituras: {},
      });

      await service.chat({ message: 'qual é a liturgia de hoje?', conversationId: 'c1' } as any, 'user-1');

      // "hoje" is recognized locally — no second axios call to extractDateWithAI
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      expect(liturgicalCalendarService.getLiturgicalData).toHaveBeenCalledTimes(1);

      const [, payload] = mockedAxios.post.mock.calls[0];
      expect((payload as any).messages[0].content).toContain('Liturgia EXATA');
    });

    it('falls back to asking the AI to extract the date when the local parser cannot recognize it', async () => {
      mockedAxios.post
        .mockResolvedValueOnce({ data: { choices: [{ message: { content: '2026-02-10' } }] } })
        .mockResolvedValueOnce(aiResponse('Resposta da IA'));

      await service.chat(
        { message: 'qual vai ser a liturgia daqui uns tempos?', conversationId: 'c1' } as any,
        'user-1',
      );

      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
      expect(liturgicalCalendarService.getLiturgicalData).toHaveBeenCalledTimes(1);
    });

    it('does not add a liturgy section for a message unrelated to liturgy', async () => {
      await service.chat({ message: 'Como está o meu dia?', conversationId: 'c1' } as any, 'user-1');

      expect(liturgicalCalendarService.getLiturgicalData).not.toHaveBeenCalled();

      const [, payload] = mockedAxios.post.mock.calls[0];
      expect((payload as any).messages[0].content).not.toContain('Liturgia EXATA');
    });

    it('still answers normally when the liturgical calendar service fails', async () => {
      liturgicalCalendarService.getLiturgicalData.mockRejectedValue(new Error('API fora do ar'));

      const result = await service.chat(
        { message: 'qual é a liturgia de hoje?', conversationId: 'c1' } as any,
        'user-1',
      );

      expect(result).toEqual({ success: true, response: 'Resposta da IA' });
    });

    it('maps a 401 from OpenAI to UNAUTHORIZED', async () => {
      mockedAxios.post.mockRejectedValue({ response: { status: 401 } });

      const result = await service.chat({ message: 'Oi', conversationId: 'c1' } as any, 'user-1');

      expect(result).toEqual({ success: false, error: 'UNAUTHORIZED', message: 'Sessão expirada.' });
    });

    it('maps a 429 from OpenAI to LIMIT_EXCEEDED', async () => {
      mockedAxios.post.mockRejectedValue({ response: { status: 429 } });

      const result = await service.chat({ message: 'Oi', conversationId: 'c1' } as any, 'user-1');

      expect(result).toEqual({ success: false, error: 'LIMIT_EXCEEDED', message: 'O VoxAI atingiu o limite diário.' });
    });

    it('maps an aborted/timed out request to TIMEOUT', async () => {
      mockedAxios.post.mockRejectedValue({ code: 'ECONNABORTED' });

      const result = await service.chat({ message: 'Oi', conversationId: 'c1' } as any, 'user-1');

      expect(result).toEqual({ success: false, error: 'TIMEOUT', message: 'O Vox demorou para responder.' });
    });

    it('maps any other OpenAI HTTP error to AI_PROVIDER_ERROR', async () => {
      mockedAxios.post.mockRejectedValue({ response: { status: 500 } });

      const result = await service.chat({ message: 'Oi', conversationId: 'c1' } as any, 'user-1');

      expect(result).toEqual({ success: false, error: 'AI_PROVIDER_ERROR', message: 'Erro na comunicação com a IA.' });
    });

    it('maps an empty AI response to a generic error without crashing', async () => {
      mockedAxios.post.mockResolvedValue({ data: { choices: [{ message: { content: '' } }] } });

      const result = await service.chat({ message: 'Oi', conversationId: 'c1' } as any, 'user-1');

      expect(result).toEqual({ success: false, error: 'UNKNOWN_ERROR', message: 'Erro inesperado no servidor.' });
    });

    it('returns a generic error (not a crash) when OPENAI_API_KEY is not configured', async () => {
      service = await buildService(undefined);

      const result = await service.chat({ message: 'Oi', conversationId: 'c1' } as any, 'user-1');

      expect(result).toEqual({ success: false, error: 'UNKNOWN_ERROR', message: 'Erro inesperado no servidor.' });
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });
  });

  describe('chatStream', () => {
    function makeRes() {
      return {
        setHeader: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
        flushHeaders: jest.fn(),
        writableEnded: false,
      } as any;
    }

    function makeReq() {
      return { on: jest.fn() } as any;
    }

    function sentEvents(res: ReturnType<typeof makeRes>) {
      return res.write.mock.calls.map((call: any[]) =>
        JSON.parse(String(call[0]).replace(/^data: /, '').trim()),
      );
    }

    it('streams delta chunks, persists the full message and ends with "done"', async () => {
      const emitter = new EventEmitter();
      mockedAxios.post.mockResolvedValueOnce({ data: emitter });

      const res = makeRes();
      const req = makeReq();

      const promise = service.chatStream({ message: 'Oi', conversationId: 'c1' } as any, 'user-1', req, res);

      await flush();

      emitter.emit('data', Buffer.from('data: {"choices":[{"delta":{"content":"Olá"}}]}\n\n'));
      emitter.emit('data', Buffer.from('data: {"choices":[{"delta":{"content":" Vox"}}],"usage":{"prompt_tokens":1,"completion_tokens":1,"total_tokens":2}}\n\n'));
      emitter.emit('data', Buffer.from('data: [DONE]\n\n'));
      emitter.emit('end');

      await promise;

      const events = sentEvents(res);
      expect(events).toEqual([
        { type: 'delta', text: 'Olá' },
        { type: 'delta', text: ' Vox' },
        { type: 'done' },
      ]);

      expect(prisma.message.create).toHaveBeenCalledWith({
        data: { conversationId: 'c1', role: 'assistant', content: 'Olá Vox' },
      });
      expect(res.end).toHaveBeenCalled();
    });

    it('registers a close handler on the request to abort the OpenAI call if the client disconnects', async () => {
      const emitter = new EventEmitter();
      mockedAxios.post.mockResolvedValueOnce({ data: emitter });

      const res = makeRes();
      const req = makeReq();

      const promise = service.chatStream({ message: 'Oi', conversationId: 'c1' } as any, 'user-1', req, res);
      await flush();

      expect(req.on).toHaveBeenCalledWith('close', expect.any(Function));

      emitter.emit('end');
      await promise;
    });

    it('sends an error event and ends the response for an empty message', async () => {
      const res = makeRes();
      const req = makeReq();

      await service.chatStream({ message: '', conversationId: 'c1' } as any, 'user-1', req, res);

      expect(sentEvents(res)).toEqual([{ type: 'error', error: 'EMPTY_MESSAGE', message: 'Mensagem vazia.' }]);
      expect(res.end).toHaveBeenCalled();
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('sends an error event for a message over 1000 characters', async () => {
      const res = makeRes();
      const req = makeReq();

      await service.chatStream({ message: 'a'.repeat(1001), conversationId: 'c1' } as any, 'user-1', req, res);

      expect(sentEvents(res)).toEqual([
        { type: 'error', error: 'MESSAGE_TOO_LONG', message: 'Mensagem muito longa.' },
      ]);
    });

    it('sends INVALID_CONVERSATION when the conversation does not exist', async () => {
      prisma.conversation.findUnique.mockResolvedValue(null);
      const res = makeRes();
      const req = makeReq();

      await service.chatStream({ message: 'Oi', conversationId: 'missing' } as any, 'user-1', req, res);

      expect(sentEvents(res)).toEqual([
        { type: 'error', error: 'INVALID_CONVERSATION', message: 'Conversa inválida.' },
      ]);
    });

    it('sends FORBIDDEN when the conversation belongs to someone else', async () => {
      prisma.conversation.findUnique.mockResolvedValue({ id: 'c1', userId: 'other-user', hasMessages: false });
      const res = makeRes();
      const req = makeReq();

      await service.chatStream({ message: 'Oi', conversationId: 'c1' } as any, 'user-1', req, res);

      expect(sentEvents(res)).toEqual([{ type: 'error', error: 'FORBIDDEN', message: 'Conversa inválida.' }]);
    });

    it('sends RATE_LIMIT when the rate limiter blocks the request', async () => {
      rateLimiter.check.mockReturnValue({ allowed: false, message: 'Calma lá', retryAfterSeconds: 9 });
      const res = makeRes();
      const req = makeReq();

      await service.chatStream({ message: 'Oi', conversationId: 'c1' } as any, 'user-1', req, res);

      expect(sentEvents(res)).toEqual([
        { type: 'error', error: 'RATE_LIMIT', message: 'Calma lá', retryAfterSeconds: 9 },
      ]);
    });

    it('streams the content-filter message directly and never calls OpenAI', async () => {
      const res = makeRes();
      const req = makeReq();

      await service.chatStream({ message: 'Qual é o meu horóscopo?', conversationId: 'c1' } as any, 'user-1', req, res);

      const events = sentEvents(res);
      expect(events[0].type).toBe('delta');
      expect(events[0].text).toContain('não posso orientar sobre esse tema');
      expect(events[1]).toEqual({ type: 'done' });
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('sends a holding message on a double-submit without calling OpenAI', async () => {
      prisma.message.findFirst.mockResolvedValue({ id: 'm1', content: 'Oi' });
      const res = makeRes();
      const req = makeReq();

      await service.chatStream({ message: 'Oi', conversationId: 'c1' } as any, 'user-1', req, res);

      expect(sentEvents(res)).toEqual([
        { type: 'delta', text: 'Aguarde, processando sua última mensagem...' },
        { type: 'done' },
      ]);
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('maps a 401 from OpenAI to an UNAUTHORIZED error event', async () => {
      mockedAxios.post.mockRejectedValue({ response: { status: 401 } });
      const res = makeRes();
      const req = makeReq();

      await service.chatStream({ message: 'Oi', conversationId: 'c1' } as any, 'user-1', req, res);

      expect(sentEvents(res)).toEqual([
        { type: 'error', error: 'UNAUTHORIZED', message: 'Sessão expirada.' },
      ]);
      expect(res.end).toHaveBeenCalled();
    });

    it('ends the response silently (no error event) when the client already disconnected', async () => {
      const emitter = new EventEmitter();
      mockedAxios.post.mockResolvedValueOnce({ data: emitter });

      const res = makeRes();
      const req = makeReq();

      const promise = service.chatStream({ message: 'Oi', conversationId: 'c1' } as any, 'user-1', req, res);
      await flush();

      // simulate the client closing the connection
      const closeHandler = req.on.mock.calls.find((c: any[]) => c[0] === 'close')[1];
      closeHandler();

      emitter.emit('error', new Error('stream aborted'));
      await promise;

      expect(res.write).not.toHaveBeenCalled();
      expect(res.end).toHaveBeenCalled();
    });
  });

});
