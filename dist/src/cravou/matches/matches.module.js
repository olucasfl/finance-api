"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MatchesModule = void 0;
const common_1 = require("@nestjs/common");
const admin_module_1 = require("../admin/admin.module");
const bracket_module_1 = require("../bracket/bracket.module");
const copa_standings_module_1 = require("../copa-standings/copa-standings.module");
const realtime_module_1 = require("../realtime/realtime.module");
const scoring_module_1 = require("../scoring/scoring.module");
const matches_admin_controller_1 = require("./matches.admin.controller");
const matches_controller_1 = require("./matches.controller");
const matches_service_1 = require("./matches.service");
let MatchesModule = class MatchesModule {
};
exports.MatchesModule = MatchesModule;
exports.MatchesModule = MatchesModule = __decorate([
    (0, common_1.Module)({
        imports: [admin_module_1.AdminModule, scoring_module_1.ScoringModule, realtime_module_1.RealtimeModule, copa_standings_module_1.CopaStandingsModule, bracket_module_1.BracketModule],
        providers: [matches_service_1.MatchesService],
        controllers: [matches_controller_1.MatchesController, matches_admin_controller_1.MatchesAdminController],
        exports: [matches_service_1.MatchesService],
    })
], MatchesModule);
//# sourceMappingURL=matches.module.js.map