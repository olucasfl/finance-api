"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const schedule_1 = require("@nestjs/schedule");
const users_module_1 = require("./modules/users/users.module");
const auth_module_1 = require("./modules/auth/auth.module");
const budgets_module_1 = require("./modules/smart-finance/budgets/budgets.module");
const expenses_module_1 = require("./modules/smart-finance/expenses/expenses.module");
const consecration_module_1 = require("./modules/oratio/consecration/consecration.module");
const liturgia_module_1 = require("./modules/oratio/liturgia/liturgia.module");
const voxai_module_1 = require("./modules/oratio/voxai/voxai.module");
const prayers_module_1 = require("./modules/oratio/prayers/prayers.module");
const rosary_module_1 = require("./modules/rosary/rosary.module");
const activity_module_1 = require("./modules/oratio/activity/activity.module");
const journey_module_1 = require("./modules/oratio/journey/journey.module");
const cravou_module_1 = require("./cravou/cravou.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
            }),
            schedule_1.ScheduleModule.forRoot(),
            users_module_1.UsersModule,
            auth_module_1.AuthModule,
            budgets_module_1.BudgetsModule,
            expenses_module_1.ExpensesModule,
            consecration_module_1.ConsecrationModule,
            liturgia_module_1.LiturgiaModule,
            voxai_module_1.VoxAiModule,
            prayers_module_1.PrayersModule,
            rosary_module_1.RosaryModule,
            activity_module_1.ActivityModule,
            journey_module_1.JourneyModule,
            cravou_module_1.CravouModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [app_service_1.AppService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map