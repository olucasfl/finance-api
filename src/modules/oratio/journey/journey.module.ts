import { Module } from "@nestjs/common"

import { JourneyController } from "./journey.controller"
import { JourneyService } from "./journey.service"
import { JourneyCron } from "./journey.cron"

import { PrismaService } from "src/prisma/prisma.service"

@Module({

  controllers: [JourneyController],

  providers: [
    JourneyService,
    JourneyCron,
    PrismaService
  ],

  exports: [JourneyService]

})
export class JourneyModule {}