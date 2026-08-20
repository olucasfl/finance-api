import { ArgumentsHost, BadRequestException } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';
import { SystemLogService } from './system-log.service';

function buildHost(request: any = {}) {
  const response = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };

  const host = {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as unknown as ArgumentsHost;

  return { host, response };
}

describe('AllExceptionsFilter', () => {
  let systemLog: { record: jest.Mock };
  let filter: AllExceptionsFilter;

  beforeEach(() => {
    systemLog = { record: jest.fn() };
    filter = new AllExceptionsFilter(systemLog as unknown as SystemLogService);
  });

  it('never leaks the real error message to the client for a non-HttpException', () => {
    const { host, response } = buildHost({ method: 'GET', originalUrl: '/oratio/vox' });

    filter.catch(new Error('database password is wrong'), host);

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith({
      statusCode: 500,
      message: 'Internal server error',
    });
  });

  it('preserves the original status and body for a known HttpException', () => {
    const { host, response } = buildHost({ method: 'POST', originalUrl: '/users' });

    filter.catch(new BadRequestException('Email already registered'), host);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Email already registered' }),
    );
  });

  it('records a 5xx error into the system log with method, path and a trimmed stack', () => {
    const { host } = buildHost({ method: 'GET', originalUrl: '/oratio/vox' });

    filter.catch(new Error('boom'), host);

    expect(systemLog.record).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        path: '/oratio/vox',
        statusCode: 500,
        message: 'boom',
        errorName: 'Error',
      }),
    );
  });

  it('does not record a 4xx HttpException into the system log', () => {
    const { host } = buildHost({ method: 'POST', originalUrl: '/users' });

    filter.catch(new BadRequestException('bad input'), host);

    expect(systemLog.record).not.toHaveBeenCalled();
  });

  it('still responds even if the request has no method/url (never throws)', () => {
    const { host, response } = buildHost(undefined);

    expect(() => filter.catch(new Error('boom'), host)).not.toThrow();
    expect(response.status).toHaveBeenCalledWith(500);
  });

  it('still responds to the client even if recording into the system log throws', () => {
    systemLog.record.mockImplementation(() => {
      throw new Error('buffer exploded');
    });
    const { host, response } = buildHost({ method: 'GET', originalUrl: '/x' });

    expect(() => filter.catch(new Error('boom'), host)).not.toThrow();
    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalled();
  });
});
