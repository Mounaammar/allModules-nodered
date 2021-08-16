"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postgresMigrations = void 0;
const _1587669153312_InitialMigration_1 = require("./1587669153312-InitialMigration");
const _1589476000887_WebhookModel_1 = require("./1589476000887-WebhookModel");
const _1594828256133_CreateIndexStoppedAt_1 = require("./1594828256133-CreateIndexStoppedAt");
const _1611144599516_AddWebhookId_1 = require("./1611144599516-AddWebhookId");
const _1607431743768_MakeStoppedAtNullable_1 = require("./1607431743768-MakeStoppedAtNullable");
const _1617270242566_CreateTagEntity_1 = require("./1617270242566-CreateTagEntity");
const _1620824779533_UniqueWorkflowNames_1 = require("./1620824779533-UniqueWorkflowNames");
exports.postgresMigrations = [
    _1587669153312_InitialMigration_1.InitialMigration1587669153312,
    _1589476000887_WebhookModel_1.WebhookModel1589476000887,
    _1594828256133_CreateIndexStoppedAt_1.CreateIndexStoppedAt1594828256133,
    _1611144599516_AddWebhookId_1.AddWebhookId1611144599516,
    _1607431743768_MakeStoppedAtNullable_1.MakeStoppedAtNullable1607431743768,
    _1617270242566_CreateTagEntity_1.CreateTagEntity1617270242566,
    _1620824779533_UniqueWorkflowNames_1.UniqueWorkflowNames1620824779533,
];
//# sourceMappingURL=index.js.map