import { Module } from "@nestjs/common"
import { VoxAiService } from "./voxai.service"
import { VoxAiController } from "./voxai.controller"
import { VoxRateLimiter } from "./guards/vox.rate-limiter"

@Module({
 controllers:[VoxAiController],
 providers:[VoxAiService, VoxRateLimiter]
})
export class VoxAiModule{}