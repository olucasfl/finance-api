"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RosaryModule = void 0;
const common_1 = require("@nestjs/common");
const rosary_controller_1 = require("./rosary.controller");
const rosary_service_1 = require("./rosary.service");
const activity_module_1 = require("../oratio/activity/activity.module");
const journey_module_1 = require("../oratio/journey/journey.module");
let RosaryModule = class RosaryModule {
};
exports.RosaryModule = RosaryModule;
exports.RosaryModule = RosaryModule = __decorate([
    (0, common_1.Module)({
        imports: [activity_module_1.ActivityModule, journey_module_1.JourneyModule],
        controllers: [rosary_controller_1.RosaryController],
        providers: [rosary_service_1.RosaryService]
    })
], RosaryModule);
//# sourceMappingURL=rosary.module.js.map