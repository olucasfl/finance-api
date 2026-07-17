import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class AddDayPrayerDto {

  @IsInt()
  @Min(0)
  order: number;

  @IsString()
  @IsNotEmpty()
  dayId: string;

  @IsString()
  @IsNotEmpty()
  prayerId: string;

}
