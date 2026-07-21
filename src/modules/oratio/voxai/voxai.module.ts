import { Module } from "@nestjs/common"
import { VoxAiService } from "./voxai.service"
import { VoxAiController } from "./voxai.controller"
import { VoxAiCron } from "./voxai.cron"
import { VoxRateLimiter } from "./guards/vox.rate-limiter"
import { LiturgicalCalendarService } from "./services/liturgical-calendar.service"
import { ActivityModule } from "../activity/activity.module"

@Module({
 imports: [ActivityModule],
 controllers:[VoxAiController],
 providers:[VoxAiService, VoxRateLimiter, LiturgicalCalendarService, VoxAiCron]
})
export class VoxAiModule{}