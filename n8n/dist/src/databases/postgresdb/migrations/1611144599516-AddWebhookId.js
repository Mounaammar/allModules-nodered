"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddWebhookId1611144599516 = void 0;
const config = require("../../../../config");
class AddWebhookId1611144599516 {
    constructor() {
        this.name = 'AddWebhookId1611144599516';
    }
    async up(queryRunner) {
        let tablePrefix = config.get('database.tablePrefix');
        const tablePrefixPure = tablePrefix;
        const schema = config.get('database.postgresdb.schema');
        if (schema) {
            tablePrefix = schema + '.' + tablePrefix;
        }
        await queryRunner.query(`ALTER TABLE ${tablePrefix}webhook_entity ADD "webhookId" character varying`);
        await queryRunner.query(`ALTER TABLE ${tablePrefix}webhook_entity ADD "pathLength" integer`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS IDX_${tablePrefixPure}16f4436789e804e3e1c9eeb240 ON ${tablePrefix}webhook_entity ("webhookId", "method", "pathLength") `);
    }
    async down(queryRunner) {
        let tablePrefix = config.get('database.tablePrefix');
        const tablePrefixPure = tablePrefix;
        const schema = config.get('database.postgresdb.schema');
        if (schema) {
            tablePrefix = schema + '.' + tablePrefix;
        }
        await queryRunner.query(`DROP INDEX IDX_${tablePrefixPure}16f4436789e804e3e1c9eeb240`);
        await queryRunner.query(`ALTER TABLE ${tablePrefix}webhook_entity DROP COLUMN "pathLength"`);
        await queryRunner.query(`ALTER TABLE ${tablePrefix}webhook_entity DROP COLUMN "webhookId"`);
    }
}
exports.AddWebhookId1611144599516 = AddWebhookId1611144599516;
//# sourceMappingURL=1611144599516-AddWebhookId.js.map