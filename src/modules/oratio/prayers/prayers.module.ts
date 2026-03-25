import { Module } from '@nestjs/common'

import { PrayersController } from './prayers.controller'
import { PrayersService } from './prayers.service'

import { PrismaService } from 'src/prisma/prisma.service'
import { ActivityModule } from '../activity/activity.module'

@Module({

 imports: [ActivityModule],

 controllers:[PrayersController],

 providers:[
  PrayersService,
  PrismaService
 ]

})
export class PrayersModule {}