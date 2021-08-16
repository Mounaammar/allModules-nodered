"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MakeStoppedAtNullable1607431743768 = void 0;
const config = require("../../../../config");
class MakeStoppedAtNullable1607431743768 {
    constructor() {
        this.name = 'MakeStoppedAtNullable1607431743768';
    }
    async up(queryRunner) {
        let tablePrefix = config.get('database.tablePrefix');
        const schema = config.get('database.postgresdb.schema');
        if (schema) {
            tablePrefix = schema + '.' + tablePrefix;
        }
        await queryRunner.query('ALTER TABLE ' + tablePrefix + 'execution_entity ALTER COLUMN "stoppedAt" DROP NOT NULL', undefined);
    }
    async down(queryRunner) {
    }
}
exports.MakeStoppedAtNullable1607431743768 = MakeStoppedAtNullable1607431743768;
//# sourceMappingURL=1607431743768-MakeStoppedAtNullable.js.map