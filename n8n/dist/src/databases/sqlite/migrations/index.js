"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sqliteMigrations = void 0;
const _1588102412422_InitialMigration_1 = require("./1588102412422-InitialMigration");
const _1592445003908_WebhookModel_1 = require("./1592445003908-WebhookModel");
const _1594825041918_CreateIndexStoppedAt_1 = require("./1594825041918-CreateIndexStoppedAt");
const _1611071044839_AddWebhookId_1 = require("./1611071044839-AddWebhookId");
const _1607431743769_MakeStoppedAtNullable_1 = require("./1607431743769-MakeStoppedAtNullable");
const _1617213344594_CreateTagEntity_1 = require("./1617213344594-CreateTagEntity");
const _1620821879465_UniqueWorkflowNames_1 = require("./1620821879465-UniqueWorkflowNames");
exports.sqliteMigrations = [
    _1588102412422_InitialMigration_1.InitialMigration1588102412422,
    _1592445003908_WebhookModel_1.WebhookModel1592445003908,
    _1594825041918_CreateIndexStoppedAt_1.CreateIndexStoppedAt1594825041918,
    _1611071044839_AddWebhookId_1.AddWebhookId1611071044839,
    _1607431743769_MakeStoppedAtNullable_1.MakeStoppedAtNullable1607431743769,
    _1617213344594_CreateTagEntity_1.CreateTagEntity1617213344594,
    _1620821879465_UniqueWorkflowNames_1.UniqueWorkflowNames1620821879465,
];
//# sourceMappingURL=index.js.map