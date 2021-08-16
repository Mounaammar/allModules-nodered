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
exports.WorkflowEntity = void 0;
const class_validator_1 = require("class-validator");
const typeorm_1 = require("typeorm");
const utils_1 = require("../utils");
const TagEntity_1 = require("./TagEntity");
let WorkflowEntity = class WorkflowEntity {
    setUpdateDate() {
        this.updatedAt = new Date();
    }
};
__decorate([
    typeorm_1.PrimaryGeneratedColumn(),
    __metadata("design:type", Number)
], WorkflowEntity.prototype, "id", void 0);
__decorate([
    typeorm_1.Index({ unique: true }),
    class_validator_1.Length(1, 128, { message: 'Workflow name must be 1 to 128 characters long.' }),
    typeorm_1.Column({ length: 128 }),
    __metadata("design:type", String)
], WorkflowEntity.prototype, "name", void 0);
__decorate([
    typeorm_1.Column(),
    __metadata("design:type", Boolean)
], WorkflowEntity.prototype, "active", void 0);
__decorate([
    typeorm_1.Column(utils_1.resolveDataType('json')),
    __metadata("design:type", Array)
], WorkflowEntity.prototype, "nodes", void 0);
__decorate([
    typeorm_1.Column(utils_1.resolveDataType('json')),
    __metadata("design:type", Object)
], WorkflowEntity.prototype, "connections", void 0);
__decorate([
    typeorm_1.CreateDateColumn({ precision: 3, default: () => utils_1.getTimestampSyntax() }),
    __metadata("design:type", Date)
], WorkflowEntity.prototype, "createdAt", void 0);
__decorate([
    typeorm_1.UpdateDateColumn({ precision: 3, default: () => utils_1.getTimestampSyntax(), onUpdate: utils_1.getTimestampSyntax() }),
    __metadata("design:type", Date)
], WorkflowEntity.prototype, "updatedAt", void 0);
__decorate([
    typeorm_1.Column({
        type: utils_1.resolveDataType('json'),
        nullable: true,
    }),
    __metadata("design:type", Object)
], WorkflowEntity.prototype, "settings", void 0);
__decorate([
    typeorm_1.Column({
        type: utils_1.resolveDataType('json'),
        nullable: true,
    }),
    __metadata("design:type", Object)
], WorkflowEntity.prototype, "staticData", void 0);
__decorate([
    typeorm_1.ManyToMany(() => TagEntity_1.TagEntity, tag => tag.workflows),
    typeorm_1.JoinTable({
        name: "workflows_tags",
        joinColumn: {
            name: "workflowId",
            referencedColumnName: "id",
        },
        inverseJoinColumn: {
            name: "tagId",
            referencedColumnName: "id",
        },
    }),
    __metadata("design:type", Array)
], WorkflowEntity.prototype, "tags", void 0);
__decorate([
    typeorm_1.BeforeUpdate(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], WorkflowEntity.prototype, "setUpdateDate", null);
WorkflowEntity = __decorate([
    typeorm_1.Entity()
], WorkflowEntity);
exports.WorkflowEntity = WorkflowEntity;
//# sourceMappingURL=WorkflowEntity.js.map