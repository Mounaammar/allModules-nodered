"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChangeCredentialDataSize1620729500000 = void 0;
const config = require("../../../../config");
class ChangeCredentialDataSize1620729500000 {
    constructor() {
        this.name = 'ChangeCredentialDataSize1620729500000';
    }
    async up(queryRunner) {
        const tablePrefix = config.get('database.tablePrefix');
        await queryRunner.query('ALTER TABLE `' + tablePrefix + 'credentials_entity` MODIFY COLUMN `type` varchar(128) NOT NULL');
    }
    async down(queryRunner) {
        const tablePrefix = config.get('database.tablePrefix');
        await queryRunner.query('ALTER TABLE `' + tablePrefix + 'credentials_entity` MODIFY COLUMN `type` varchar(32) NOT NULL');
    }
}
exports.ChangeCredentialDataSize1620729500000 = ChangeCredentialDataSize1620729500000;
//# sourceMappingURL=1620729500000-ChangeCredentialDataSize.js.map