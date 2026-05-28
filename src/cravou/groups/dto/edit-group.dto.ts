import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

export class EditGroupDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;
}
