import { IsString, IsOptional, IsArray, ValidateNested } from "class-validator"
import { Type } from "class-transformer"

class HistoryDto {

 @IsString()
 role: "user" | "assistant"

 @IsString()
 content: string

}

export class VoxAiDto {

 @IsString()
 message: string

 @IsOptional()
 @IsArray()
 @ValidateNested({ each: true })
 @Type(() => HistoryDto)
 history?: HistoryDto[]

}