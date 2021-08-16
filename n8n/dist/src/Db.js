"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.init = exports.collections = void 0;
const _1 = require("./");
const n8n_core_1 = require("n8n-core");
const typeorm_1 = require("typeorm");
const config = require("../config");
const entities_1 = require("./databases/entities");
exports.collections = {
    Credentials: null,
    Execution: null,
    Workflow: null,
    Webhook: null,
    Tag: null,
};
const migrations_1 = require("./databases/postgresdb/migrations");
const migrations_2 = require("./databases/mysqldb/migrations");
const migrations_3 = require("./databases/sqlite/migrations");
const path = require("path");
async function init() {
    const dbType = await _1.GenericHelpers.getConfigValue('database.type');
    const n8nFolder = n8n_core_1.UserSettings.getUserN8nFolderPath();
    let connectionOptions;
    const entityPrefix = config.get('database.tablePrefix');
    switch (dbType) {
        case 'postgresdb':
            const sslCa = await _1.GenericHelpers.getConfigValue('database.postgresdb.ssl.ca');
            const sslCert = await _1.GenericHelpers.getConfigValue('database.postgresdb.ssl.cert');
            const sslKey = await _1.GenericHelpers.getConfigValue('database.postgresdb.ssl.key');
            const sslRejectUnauthorized = await _1.GenericHelpers.getConfigValue('database.postgresdb.ssl.rejectUnauthorized');
            let ssl = undefined;
            if (sslCa !== '' || sslCert !== '' || sslKey !== '' || sslRejectUnauthorized !== true) {
                ssl = {
                    ca: sslCa || undefined,
                    cert: sslCert || undefined,
                    key: sslKey || undefined,
                    rejectUnauthorized: sslRejectUnauthorized,
                };
            }
            connectionOptions = {
                type: 'postgres',
                entityPrefix,
                database: await _1.GenericHelpers.getConfigValue('database.postgresdb.database'),
                host: await _1.GenericHelpers.getConfigValue('database.postgresdb.host'),
                password: await _1.GenericHelpers.getConfigValue('database.postgresdb.password'),
                port: await _1.GenericHelpers.getConfigValue('database.postgresdb.port'),
                username: await _1.GenericHelpers.getConfigValue('database.postgresdb.user'),
                schema: config.get('database.postgresdb.schema'),
                migrations: migrations_1.postgresMigrations,
                migrationsRun: true,
                migrationsTableName: `${entityPrefix}migrations`,
                ssl,
            };
            break;
        case 'mariadb':
        case 'mysqldb':
            connectionOptions = {
                type: dbType === 'mysqldb' ? 'mysql' : 'mariadb',
                database: await _1.GenericHelpers.getConfigValue('database.mysqldb.database'),
                entityPrefix,
                host: await _1.GenericHelpers.getConfigValue('database.mysqldb.host'),
                password: await _1.GenericHelpers.getConfigValue('database.mysqldb.password'),
                port: await _1.GenericHelpers.getConfigValue('database.mysqldb.port'),
                username: await _1.GenericHelpers.getConfigValue('database.mysqldb.user'),
                migrations: migrations_2.mysqlMigrations,
                migrationsRun: true,
                migrationsTableName: `${entityPrefix}migrations`,
            };
            break;
        case 'sqlite':
            connectionOptions = {
                type: 'sqlite',
                database: path.join(n8nFolder, 'database.sqlite'),
                entityPrefix,
                migrations: migrations_3.sqliteMigrations,
                migrationsRun: false,
                migrationsTableName: `${entityPrefix}migrations`,
            };
            break;
        default:
            throw new Error(`The database "${dbType}" is currently not supported!`);
    }
    Object.assign(connectionOptions, {
        entities: Object.values(entities_1.entities),
        synchronize: false,
        logging: false,
    });
    let connection = await typeorm_1.createConnection(connectionOptions);
    if (dbType === 'sqlite') {
        let migrations = [];
        try {
            migrations = await connection.query(`SELECT id FROM ${entityPrefix}migrations where name = "MakeStoppedAtNullable1607431743769"`);
        }
        catch (error) {
        }
        await connection.runMigrations({
            transaction: 'none',
        });
        if (migrations.length === 0) {
            await connection.close();
            connection = await typeorm_1.createConnection(connectionOptions);
        }
    }
    exports.collections.Credentials = typeorm_1.getRepository(entities_1.entities.CredentialsEntity);
    exports.collections.Execution = typeorm_1.getRepository(entities_1.entities.ExecutionEntity);
    exports.collections.Workflow = typeorm_1.getRepository(entities_1.entities.WorkflowEntity);
    exports.collections.Webhook = typeorm_1.getRepository(entities_1.entities.WebhookEntity);
    exports.collections.Tag = typeorm_1.getRepository(entities_1.entities.TagEntity);
    return exports.collections;
}
exports.init = init;
//# sourceMappingURL=Db.js.map