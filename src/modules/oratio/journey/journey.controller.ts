import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards
} from "@nestjs/common"

import { JwtAuthGuard }
from "src/modules/auth/jwt-auth.guard"

import { JourneyService }
from "./journey.service"

import { CreateJourneyDto }
from "./dto/create-journey.dto"
import { CreateIntentDto } from "./dto/create-intent.dto"

@Controller("oratio/journey")
export class JourneyController {

  constructor(
    private readonly service: JourneyService
  ) {}

  /*
  ============================
  CREATE
  ============================
  */

  @Post("create")
  @UseGuards(JwtAuthGuard)
  create(
    @Req() req: any,
    @Body() dto: CreateJourneyDto
  ) {

    return this.service.createJourney(
      req.user.userId,
      dto.partnerEmail
    )

  }

  /*
  ============================
  GET JOURNEY
  ============================
  */

  @Get()
  @UseGuards(JwtAuthGuard)
  getJourney(
    @Req() req: any
  ) {

    return this.service.getJourney(
      req.user.userId
    )

  }

  /*
  ============================
  HISTORY
  ============================
  */

  @Get("history")
  @UseGuards(JwtAuthGuard)
  getHistory(
    @Req() req: any
  ) {

    return this.service.getHistory(
      req.user.userId
    )

  }

  /*
============================
DELETE JOURNEY
============================
*/

    @Delete()
    @UseGuards(JwtAuthGuard)
    deleteJourney(
    @Req() req:any
    ){

    return this.service.deleteJourney(
        req.user.userId
    )

    }

    @Post("intent")
@UseGuards(JwtAuthGuard)
createIntent(
  @Req() req:any,
  @Body() dto:CreateIntentDto
){

  return this.service.createIntent(
    req.user.userId,
    dto.text
  )

}

@Delete("intent/:id")
@UseGuards(JwtAuthGuard)
deleteIntent(
  @Req() req:any,
  @Param("id") id:string
){

  return this.service.deleteIntent(
    req.user.userId,
    id
  )

}

}