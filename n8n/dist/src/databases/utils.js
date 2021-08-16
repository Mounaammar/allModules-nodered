"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTimestampSyntax = exports.resolveDataType = void 0;
const GenericHelpers_1 = require("../../src/GenericHelpers");
function resolveDataType(dataType) {
    var _a;
    const dbType = GenericHelpers_1.getConfigValueSync('database.type');
    const typeMap = {
        sqlite: {
            json: 'simple-json',
        },
        postgresdb: {
            datetime: 'timestamp',
        },
        mysqldb: {},
        mariadb: {},
    };
    return (_a = typeMap[dbType][dataType]) !== null && _a !== void 0 ? _a : dataType;
}
exports.resolveDataType = resolveDataType;
function getTimestampSyntax() {
    const dbType = GenericHelpers_1.getConfigValueSync('database.type');
    const map = {
        sqlite: "STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')",
        postgresdb: "CURRENT_TIMESTAMP(3)",
        mysqldb: "CURRENT_TIMESTAMP(3)",
        mariadb: "CURRENT_TIMESTAMP(3)",
    };
    return map[dbType];
}
exports.getTimestampSyntax = getTimestampSyntax;
//# sourceMappingURL=utils.js.map