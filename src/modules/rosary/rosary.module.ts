import { Module } from "@nestjs/common"

import { RosaryController } from "./rosary.controller"
import { RosaryService } from "./rosary.service"

@Module({

 controllers:[RosaryController],

 providers:[RosaryService]

})

export class RosaryModule{}