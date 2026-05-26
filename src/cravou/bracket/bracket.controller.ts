import { Controller, Get, Param } from '@nestjs/common';
import { BracketService } from './bracket.service';

@Controller('cravou/bracket')
export class BracketController {
  constructor(private readonly bracketService: BracketService) {}

  @Get()
  getBracket() {
    return this.bracketService.getBracket();
  }

  @Get('round-of-32')
  getRoundOf32() {
    return this.bracketService.getBracketByRound('round_of_32');
  }

  @Get('round-of-16')
  getRoundOf16() {
    return this.bracketService.getBracketByRound('round_of_16');
  }

  @Get('quarterfinals')
  getQuarterfinals() {
    return this.bracketService.getBracketByRound('quarterfinal');
  }

  @Get('semifinals')
  getSemifinals() {
    return this.bracketService.getBracketByRound('semifinal');
  }

  @Get('final')
  getFinal() {
    return this.bracketService.getBracketByRound('final');
  }

  @Get(':round')
  getByRound(@Param('round') round: string) {
    return this.bracketService.getBracketByRound(round);
  }
}
