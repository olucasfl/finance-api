import { Module } from "@nestjs/common"

import { RosaryController } from "./rosary.controller"
import { RosaryService } from "./rosary.service"
import { ActivityModule } from "../oratio/activity/activity.module"

@Module({

 imports: [ActivityModule],

 controllers:[RosaryController],

 providers:[RosaryService]

})

export class RosaryModule{}