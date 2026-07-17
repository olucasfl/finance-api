import { IsNotEmpty, IsString } from 'class-validator';

export class CreateConsecrationPrayerDto {

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  content: string;

}
