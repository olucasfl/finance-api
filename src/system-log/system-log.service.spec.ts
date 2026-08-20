import { Test, TestingModule } from '@nestjs/testing';
import { SystemLogService } from './system-log.service';

describe('SystemLogService', () => {
  let service: SystemLogService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SystemLogService],
    }).compile();

    service = module.get<SystemLogService>(SystemLogService);
  });

  it('returns recorded entries newest first', () => {
    service.record({ method: 'GET', path: '/a', statusCode: 500, message: 'first' });
    service.record({ method: 'GET', path: '/b', statusCode: 500, message: 'second' });

    const recent = service.getRecent();

    expect(recent[0].message).toBe('second');
    expect(recent[1].message).toBe('first');
  });

  it('stamps each entry with a timestamp', () => {
    service.record({ method: 'GET', path: '/a', statusCode: 500, message: 'oops' });

    expect(service.getRecent()[0].timestamp).toBeInstanceOf(Date);
  });

  it('caps the buffer at 100 entries, evicting the oldest first', () => {
    for (let i = 0; i < 105; i++) {
      service.record({ method: 'GET', path: `/${i}`, statusCode: 500, message: `msg-${i}` });
    }

    const all = service.getRecent(200);

    expect(all).toHaveLength(100);
    // Newest (104) first, oldest kept is 5 — entries 0..4 were evicted.
    expect(all[0].message).toBe('msg-104');
    expect(all[all.length - 1].message).toBe('msg-5');
  });

  it('getRecent defaults to the 50 most recent entries', () => {
    for (let i = 0; i < 60; i++) {
      service.record({ method: 'GET', path: `/${i}`, statusCode: 500, message: `msg-${i}` });
    }

    expect(service.getRecent()).toHaveLength(50);
  });
});
