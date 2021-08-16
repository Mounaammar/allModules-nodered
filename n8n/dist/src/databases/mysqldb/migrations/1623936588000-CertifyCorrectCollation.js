"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CertifyCorrectCollation1623936588000 = void 0;
const config = require("../../../../config");
class CertifyCorrectCollation1623936588000 {
    constructor() {
        this.name = 'CertifyCorrectCollation1623936588000';
    }
    async up(queryRunner) {
        const tablePrefix = config.get('database.tablePrefix');
        const databaseType = config.get('database.type');
        if (databaseType === 'mariadb') {
            return;
        }
        const checkCollationExistence = await queryRunner.query(`show collation where collation like 'utf8mb4_0900_ai_ci';`);
        let collation = 'utf8mb4_general_ci';
        if (checkCollationExistence.length > 0) {
            collation = 'utf8mb4_0900_ai_ci';
        }
        const databaseName = config.get(`database.mysqldb.database`);
        await queryRunner.query(`ALTER DATABASE \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE ${collation};`);
        for (const tableName of [
            'credentials_entity',
            'execution_entity',
            'tag_entity',
            'webhook_entity',
            'workflow_entity',
            'workflows_tags',
        ]) {
            await queryRunner.query(`ALTER TABLE ${tablePrefix}${tableName} CONVERT TO CHARACTER SET utf8mb4 COLLATE ${collation};`);
        }
    }
    async down(queryRunner) {
    }
}
exports.CertifyCorrectCollation1623936588000 = CertifyCorrectCollation1623936588000;
//# sourceMappingURL=1623936588000-CertifyCorrectCollation.js.map