import { IsString, IsUUID } from "class-validator"

export class VoxAiDto {

 @IsString()
 message: string

 @IsUUID()
 conversationId: string

}