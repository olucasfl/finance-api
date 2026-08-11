import { Injectable } from '@nestjs/common';

export interface SystemLogEntry {
  timestamp: Date;
  method: string;
  path: string;
  statusCode: number;
  message: string;
  errorName?: string;
  stack?: string;
}

/*
Buffer em memória, sem tocar o banco — de propósito. Guarda só os
últimos MAX_ENTRIES erros 5xx pra dar visibilidade rápida no painel
admin, sem custo de armazenamento e sem risco pro plano gratuito.
Reseta a cada deploy/restart — não é um log de auditoria, é só "o que
quebrou recentemente".
*/
@Injectable()
export class SystemLogService {
  private readonly MAX_ENTRIES = 100;
  private entries: SystemLogEntry[] = [];

  record(entry: Omit<SystemLogEntry, 'timestamp'>) {
    this.entries.unshift({ ...entry, timestamp: new Date() });

    if (this.entries.length > this.MAX_ENTRIES) {
      this.entries.length = this.MAX_ENTRIES;
    }
  }

  getRecent(limit = 50) {
    return this.entries.slice(0, limit);
  }
}
