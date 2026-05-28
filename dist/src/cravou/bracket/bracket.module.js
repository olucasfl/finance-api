"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BracketModule = void 0;
const common_1 = require("@nestjs/common");
const prisma_module_1 = require("../../prisma/prisma.module");
const admin_module_1 = require("../admin/admin.module");
const realtime_module_1 = require("../realtime/realtime.module");
const bracket_admin_controller_1 = require("./bracket.admin.controller");
const bracket_controller_1 = require("./bracket.controller");
const bracket_service_1 = require("./bracket.service");
const third_place_service_1 = require("./third-place.service");
let BracketModule = class BracketModule {
};
exports.BracketModule = BracketModule;
exports.BracketModule = BracketModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, realtime_module_1.RealtimeModule, admin_module_1.AdminModule],
        controllers: [bracket_controller_1.BracketController, bracket_admin_controller_1.BracketAdminController],
        providers: [bracket_service_1.BracketService, third_place_service_1.ThirdPlaceService],
        exports: [bracket_service_1.BracketService],
    })
], BracketModule);
//# sourceMappingURL=bracket.module.js.map