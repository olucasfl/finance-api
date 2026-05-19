import { Module } from "@nestjs/common"

import { RosaryController } from "./rosary.controller"
import { RosaryService } from "./rosary.service"
import { ActivityModule } from "../oratio/activity/activity.module"
import { JourneyModule } from "../oratio/journey/journey.module"

@Module({

 imports: [ActivityModule, JourneyModule],

 controllers:[RosaryController],

 providers:[RosaryService]

})

export class RosaryModule{}