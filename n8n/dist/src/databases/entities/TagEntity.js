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
exports.TagEntity = void 0;
const typeorm_1 = require("typeorm");
const class_validator_1 = require("class-validator");
const WorkflowEntity_1 = require("./WorkflowEntity");
const utils_1 = require("../utils");
let TagEntity = class TagEntity {
    setUpdateDate() {
        this.updatedAt = new Date();
    }
};
__decorate([
    typeorm_1.PrimaryGeneratedColumn(),
    __metadata("design:type", Number)
], TagEntity.prototype, "id", void 0);
__decorate([
    typeorm_1.Column({ length: 24 }),
    typeorm_1.Index({ unique: true }),
    class_validator_1.IsString({ message: 'Tag name must be of type string.' }),
    class_validator_1.Length(1, 24, { message: 'Tag name must be 1 to 24 characters long.' }),
    __metadata("design:type", String)
], TagEntity.prototype, "name", void 0);
__decorate([
    typeorm_1.CreateDateColumn({ precision: 3, default: () => utils_1.getTimestampSyntax() }),
    class_validator_1.IsOptional(),
    class_validator_1.IsDate(),
    __metadata("design:type", Date)
], TagEntity.prototype, "createdAt", void 0);
__decorate([
    typeorm_1.UpdateDateColumn({ precision: 3, default: () => utils_1.getTimestampSyntax(), onUpdate: utils_1.getTimestampSyntax() }),
    class_validator_1.IsOptional(),
    class_validator_1.IsDate(),
    __metadata("design:type", Date)
], TagEntity.prototype, "updatedAt", void 0);
__decorate([
    typeorm_1.ManyToMany(() => WorkflowEntity_1.WorkflowEntity, workflow => workflow.tags),
    __metadata("design:type", Array)
], TagEntity.prototype, "workflows", void 0);
__decorate([
    typeorm_1.BeforeUpdate(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], TagEntity.prototype, "setUpdateDate", null);
TagEntity = __decorate([
    typeorm_1.Entity()
], TagEntity);
exports.TagEntity = TagEntity;
//# sourceMappingURL=TagEntity.js.map