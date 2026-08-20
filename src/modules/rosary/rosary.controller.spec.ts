import { Test, TestingModule } from '@nestjs/testing';
import { RosaryController } from './rosary.controller';
import { RosaryService } from './rosary.service';

describe('RosaryController', () => {
  let controller: RosaryController;
  let service: {
    getSession: jest.Mock;
    getActiveProgress: jest.Mock;
    getHistory: jest.Mock;
    start: jest.Mock;
    updateStep: jest.Mock;
    finish: jest.Mock;
    getRosary: jest.Mock;
  };

  const req = { user: { userId: 'user-1' } };

  beforeEach(async () => {
    service = {
      getSession: jest.fn(),
      getActiveProgress: jest.fn(),
      getHistory: jest.fn(),
      start: jest.fn(),
      updateStep: jest.fn(),
      finish: jest.fn(),
      getRosary: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RosaryController],
      providers: [{ provide: RosaryService, useValue: service }],
    }).compile();

    controller = module.get<RosaryController>(RosaryController);
  });

  it('session() delegates to service.getSession with the caller id and query type', () => {
    controller.session(req, 'gozosos');
    expect(service.getSession).toHaveBeenCalledWith('user-1', 'gozosos');
  });

  it('progress() delegates to service.getActiveProgress with the caller id', () => {
    controller.progress(req);
    expect(service.getActiveProgress).toHaveBeenCalledWith('user-1');
  });

  it('history() delegates to service.getHistory with the caller id', () => {
    controller.history(req);
    expect(service.getHistory).toHaveBeenCalledWith('user-1');
  });

  it('start() delegates to service.start with type and restart from the body', () => {
    controller.start(req, { type: 'gozosos', restart: true });
    expect(service.start).toHaveBeenCalledWith('user-1', 'gozosos', true);
  });

  it('step() delegates to service.updateStep with type, step and elapsedSeconds from the body', () => {
    controller.step(req, { type: 'gozosos', step: 4, elapsedSeconds: 90 });
    expect(service.updateStep).toHaveBeenCalledWith('user-1', 'gozosos', 4, 90);
  });

  it('finish() delegates to service.finish with the caller id and type', () => {
    controller.finish(req, { type: 'gozosos' });
    expect(service.finish).toHaveBeenCalledWith('user-1', 'gozosos');
  });

  it('getRosary() delegates to service.getRosary with the path param, without requiring auth', () => {
    controller.getRosary('sao-miguel');
    expect(service.getRosary).toHaveBeenCalledWith('sao-miguel');
  });
});
