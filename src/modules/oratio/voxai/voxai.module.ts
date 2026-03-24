import { Module } from "@nestjs/common"
import { VoxAiService } from "./voxai.service"
import { VoxAiController } from "./voxai.controller"
import { VoxRateLimiter } from "./guards/vox.rate-limiter"
import { LiturgicalCalendarService } from "./services/liturgical-calendar.service"

@Module({
 controllers:[VoxAiController],
 providers:[VoxAiService, VoxRateLimiter, LiturgicalCalendarService]
})
export class VoxAiModule{}