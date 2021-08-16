"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MakeStoppedAtNullable1607431743767 = void 0;
const config = require("../../../../config");
class MakeStoppedAtNullable1607431743767 {
    async up(queryRunner) {
        const tablePrefix = config.get('database.tablePrefix');
        await queryRunner.query('ALTER TABLE `' + tablePrefix + 'execution_entity` MODIFY `stoppedAt` datetime', undefined);
    }
    async down(queryRunner) {
        const tablePrefix = config.get('database.tablePrefix');
        await queryRunner.query('ALTER TABLE `' + tablePrefix + 'execution_entity` MODIFY `stoppedAt` datetime NOT NULL', undefined);
    }
}
exports.MakeStoppedAtNullable1607431743767 = MakeStoppedAtNullable1607431743767;
//# sourceMappingURL=1607431743767-MakeStoppedAtNullable.js.map