"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CopaStandingsModule = void 0;
const common_1 = require("@nestjs/common");
const prisma_module_1 = require("../../prisma/prisma.module");
const admin_module_1 = require("../admin/admin.module");
const realtime_module_1 = require("../realtime/realtime.module");
const bracket_module_1 = require("../bracket/bracket.module");
const copa_standings_controller_1 = require("./copa-standings.controller");
const copa_standings_service_1 = require("./copa-standings.service");
const tiebreaker_service_1 = require("./tiebreaker.service");
let CopaStandingsModule = class CopaStandingsModule {
};
exports.CopaStandingsModule = CopaStandingsModule;
exports.CopaStandingsModule = CopaStandingsModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, realtime_module_1.RealtimeModule, admin_module_1.AdminModule, bracket_module_1.BracketModule],
        controllers: [copa_standings_controller_1.CopaStandingsController],
        providers: [copa_standings_service_1.CopaStandingsService, tiebreaker_service_1.TiebreakerService],
        exports: [copa_standings_service_1.CopaStandingsService],
    })
], CopaStandingsModule);
//# sourceMappingURL=copa-standings.module.js.map