import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/jwt-auth.guard';
import { WrappedService } from './wrapped.service';

@Controller('cravou/wrapped')
@UseGuards(JwtAuthGuard)
export class WrappedController {
  constructor(private readonly wrappedService: WrappedService) {}

  @Get('status')
  status(@Req() req: any) {
    return this.wrappedService.getStatusFor(req.user.userId);
  }

  @Get('comparison')
  comparison() {
    return this.wrappedService.getComparison();
  }
}
