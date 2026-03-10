import { Module } from "@nestjs/common"
import { LiturgiaController } from "./liturgia.controller"
import { LiturgiaService } from "./liturgia.service"

@Module({
 controllers:[LiturgiaController],
 providers:[LiturgiaService]
})
export class LiturgiaModule{}