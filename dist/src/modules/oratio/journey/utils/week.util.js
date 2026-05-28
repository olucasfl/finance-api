"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWeekKey = getWeekKey;
exports.getCurrentWeekKey = getCurrentWeekKey;
function getWeekKey(date) {
    const firstDay = new Date(date.getFullYear(), 0, 1);
    const pastDays = Math.floor((date.getTime() - firstDay.getTime()) / 86400000);
    const week = Math.ceil((pastDays + firstDay.getDay() + 1) / 7);
    return `${date.getFullYear()}-W${week}`;
}
function getCurrentWeekKey() {
    return getWeekKey(new Date());
}
//# sourceMappingURL=week.util.js.map