import { IsIn, IsString } from "class-validator"

import { VOX_PROFILE_KEYS } from "../prompts/vox.prompt"

export class SetVoxProfileDto {

 @IsString()
 @IsIn(VOX_PROFILE_KEYS)
 profile: string

}
