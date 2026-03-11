import { Controller, Post, Body } from "@nestjs/common"
import { VoxAiService } from "./voxai.service"
import { VoxAiDto } from "./dto/voxai.dto"

@Controller("oratio/voxai")
export class VoxAiController{

 constructor(private readonly voxAiService:VoxAiService){}

 @Post("chat")
 async chat(@Body() body:VoxAiDto){
  return this.voxAiService.chat(body)
 }

}