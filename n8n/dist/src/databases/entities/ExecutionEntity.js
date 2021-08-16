"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExecutionEntity = void 0;
const utils_1 = require("../utils");
const typeorm_1 = require("typeorm");
let ExecutionEntity = class ExecutionEntity {
};
__decorate([
    typeorm_1.PrimaryGeneratedColumn(),
    __metadata("design:type", Number)
], ExecutionEntity.prototype, "id", void 0);
__decorate([
    typeorm_1.Column('text'),
    __metadata("design:type", String)
], ExecutionEntity.prototype, "data", void 0);
__decorate([
    typeorm_1.Column(),
    __metadata("design:type", Boolean)
], ExecutionEntity.prototype, "finished", void 0);
__decorate([
    typeorm_1.Column('varchar'),
    __metadata("design:type", String)
], ExecutionEntity.prototype, "mode", void 0);
__decorate([
    typeorm_1.Column({ nullable: true }),
    __metadata("design:type", String)
], ExecutionEntity.prototype, "retryOf", void 0);
__decorate([
    typeorm_1.Column({ nullable: true }),
    __metadata("design:type", String)
], ExecutionEntity.prototype, "retrySuccessId", void 0);
__decorate([
    typeorm_1.Column(utils_1.resolveDataType('datetime')),
    __metadata("design:type", Date)
], ExecutionEntity.prototype, "startedAt", void 0);
__decorate([
    typeorm_1.Index(),
    typeorm_1.Column({ type: utils_1.resolveDataType('datetime'), nullable: true }),
    __metadata("design:type", Date)
], ExecutionEntity.prototype, "stoppedAt", void 0);
__decorate([
    typeorm_1.Column(utils_1.resolveDataType('json')),
    __metadata("design:type", Object)
], ExecutionEntity.prototype, "workflowData", void 0);
__decorate([
    typeorm_1.Index(),
    typeorm_1.Column({ nullable: true }),
    __metadata("design:type", String)
], ExecutionEntity.prototype, "workflowId", void 0);
ExecutionEntity = __decorate([
    typeorm_1.Entity()
], ExecutionEntity);
exports.ExecutionEntity = ExecutionEntity;
//# sourceMappingURL=ExecutionEntity.js.map