import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/jwt-auth.guard';
import { AdminGuard } from './admin.guard';

@Controller('cravou/admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  @Get()
  status() {
    return { status: 'ok', domain: 'cravou-admin' };
  }
}
