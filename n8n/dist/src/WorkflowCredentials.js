"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowCredentials = void 0;
const _1 = require("./");
async function WorkflowCredentials(nodes) {
    const returnCredentials = {};
    let node, type, name, foundCredentials;
    for (node of nodes) {
        if (node.disabled === true || !node.credentials) {
            continue;
        }
        for (type of Object.keys(node.credentials)) {
            if (!returnCredentials.hasOwnProperty(type)) {
                returnCredentials[type] = {};
            }
            name = node.credentials[type];
            if (!returnCredentials[type].hasOwnProperty(name)) {
                foundCredentials = await _1.Db.collections.Credentials.find({ name, type });
                if (!foundCredentials.length) {
                    throw new Error(`Could not find credentials for type "${type}" with name "${name}".`);
                }
                returnCredentials[type][name] = foundCredentials[0];
            }
        }
    }
    return returnCredentials;
}
exports.WorkflowCredentials = WorkflowCredentials;
//# sourceMappingURL=WorkflowCredentials.js.map