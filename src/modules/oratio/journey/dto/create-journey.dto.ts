import { IsEmail } from "class-validator"

export class CreateJourneyDto {

  @IsEmail()
  partnerEmail!: string

}