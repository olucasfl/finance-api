"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CravouModule = void 0;
const common_1 = require("@nestjs/common");
const admin_module_1 = require("./admin/admin.module");
const bracket_module_1 = require("./bracket/bracket.module");
const copa_standings_module_1 = require("./copa-standings/copa-standings.module");
const groups_module_1 = require("./groups/groups.module");
const matches_module_1 = require("./matches/matches.module");
const predictions_module_1 = require("./predictions/predictions.module");
const ranking_module_1 = require("./ranking/ranking.module");
const realtime_module_1 = require("./realtime/realtime.module");
const scheduled_module_1 = require("./scheduled/scheduled.module");
const scoring_module_1 = require("./scoring/scoring.module");
let CravouModule = class CravouModule {
};
exports.CravouModule = CravouModule;
exports.CravouModule = CravouModule = __decorate([
    (0, common_1.Module)({
        imports: [
            admin_module_1.AdminModule,
            realtime_module_1.RealtimeModule,
            scoring_module_1.ScoringModule,
            matches_module_1.MatchesModule,
            predictions_module_1.PredictionsModule,
            ranking_module_1.RankingModule,
            groups_module_1.GroupsModule,
            copa_standings_module_1.CopaStandingsModule,
            bracket_module_1.BracketModule,
            scheduled_module_1.ScheduledModule,
        ],
    })
], CravouModule);
//# sourceMappingURL=cravou.module.js.map