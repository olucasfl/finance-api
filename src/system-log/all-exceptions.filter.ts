import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { BaseWsExceptionFilter } from '@nestjs/websockets';
import { SystemLogService } from './system-log.service';

/*
Filtro global só pra OBSERVAR erros HTTP 5xx e registrar no
SystemLogService — a resposta enviada ao cliente é reconstruída pra
ficar idêntica ao comportamento padrão do Nest (mesmo formato de
sempre), então nenhuma rota existente muda de comportamento.

Contextos que não são HTTP (o gateway de realtime do Cravou usa
WebSocket) são repassados pro filtro padrão de WS do próprio Nest —
sem isso, um erro num socket handler ficaria sem resposta nenhuma
pro cliente, silenciosamente.
*/
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly wsFilter = new BaseWsExceptionFilter();

  constructor(private readonly systemLog: SystemLogService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    if (host.getType() !== 'http') {
      return this.wsFilter.catch(exception as any, host);
    }

    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const body = isHttpException
      ? exception.getResponse()
      : { statusCode: status, message: 'Internal server error' };

    try {
      if (status >= 500) {
        const isError = exception instanceof Error;
        const message = isError ? exception.message : 'Erro desconhecido';

        // Só as 6 primeiras linhas do stack — o bastante pra achar o
        // arquivo/linha que quebrou sem guardar um bloco gigante por
        // erro (o buffer é só memória, precisa continuar leve).
        const stack = isError && exception.stack
          ? exception.stack.split('\n').slice(0, 6).join('\n')
          : undefined;

        this.systemLog.record({
          method: request?.method ?? '?',
          path: request?.originalUrl ?? request?.url ?? '?',
          statusCode: status,
          message,
          errorName: isError ? exception.constructor.name : undefined,
          stack,
        });
      }
    } catch {
      // nunca deixa o registro do log derrubar a resposta de erro real
    }

    response
      .status(status)
      .json(typeof body === 'string' ? { statusCode: status, message: body } : body);
  }
}
