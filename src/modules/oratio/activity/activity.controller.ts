import { Controller, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { ActivityService } from './activity.service';

@Controller('activity')
export class ActivityController {
  constructor(private activityService: ActivityService) {}

  @Post('ping')
  @UseGuards(JwtAuthGuard)
  async ping(@Req() req: any) {
    const userId = req.user.userId;

    return this.activityService.log(
      userId,
      'LOGIN',
      'Entrou no app'
    );
  }
}