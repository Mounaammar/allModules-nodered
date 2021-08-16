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
exports.CredentialsEntity = void 0;
const utils_1 = require("../utils");
const typeorm_1 = require("typeorm");
let CredentialsEntity = class CredentialsEntity {
    setUpdateDate() {
        this.updatedAt = new Date();
    }
};
__decorate([
    typeorm_1.PrimaryGeneratedColumn(),
    __metadata("design:type", Number)
], CredentialsEntity.prototype, "id", void 0);
__decorate([
    typeorm_1.Column({
        length: 128,
    }),
    __metadata("design:type", String)
], CredentialsEntity.prototype, "name", void 0);
__decorate([
    typeorm_1.Column('text'),
    __metadata("design:type", String)
], CredentialsEntity.prototype, "data", void 0);
__decorate([
    typeorm_1.Index(),
    typeorm_1.Column({
        length: 32,
    }),
    __metadata("design:type", String)
], CredentialsEntity.prototype, "type", void 0);
__decorate([
    typeorm_1.Column(utils_1.resolveDataType('json')),
    __metadata("design:type", Array)
], CredentialsEntity.prototype, "nodesAccess", void 0);
__decorate([
    typeorm_1.CreateDateColumn({ precision: 3, default: () => utils_1.getTimestampSyntax() }),
    __metadata("design:type", Date)
], CredentialsEntity.prototype, "createdAt", void 0);
__decorate([
    typeorm_1.UpdateDateColumn({ precision: 3, default: () => utils_1.getTimestampSyntax(), onUpdate: utils_1.getTimestampSyntax() }),
    __metadata("design:type", Date)
], CredentialsEntity.prototype, "updatedAt", void 0);
__decorate([
    typeorm_1.BeforeUpdate(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CredentialsEntity.prototype, "setUpdateDate", null);
CredentialsEntity = __decorate([
    typeorm_1.Entity()
], CredentialsEntity);
exports.CredentialsEntity = CredentialsEntity;
//# sourceMappingURL=CredentialsEntity.js.map