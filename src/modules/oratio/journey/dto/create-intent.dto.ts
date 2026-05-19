import {
  IsString,
  MinLength,
  MaxLength
} from "class-validator"

export class CreateIntentDto {

  @IsString()

  @MinLength(3)

  @MaxLength(180)

  text!:string

}