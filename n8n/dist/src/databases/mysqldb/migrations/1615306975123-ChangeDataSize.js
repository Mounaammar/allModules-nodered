"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChangeDataSize1615306975123 = void 0;
const config = require("../../../../config");
class ChangeDataSize1615306975123 {
    constructor() {
        this.name = 'ChangeDataSize1615306975123';
    }
    async up(queryRunner) {
        const tablePrefix = config.get('database.tablePrefix');
        await queryRunner.query('ALTER TABLE `' + tablePrefix + 'execution_entity` MODIFY COLUMN `data` MEDIUMTEXT NOT NULL');
    }
    async down(queryRunner) {
        const tablePrefix = config.get('database.tablePrefix');
        await queryRunner.query('ALTER TABLE `' + tablePrefix + 'execution_entity` MODIFY COLUMN `data` TEXT NOT NULL');
    }
}
exports.ChangeDataSize1615306975123 = ChangeDataSize1615306975123;
//# sourceMappingURL=1615306975123-ChangeDataSize.js.map