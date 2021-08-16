"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodeTypes = void 0;
const n8n_workflow_1 = require("n8n-workflow");
class NodeTypesClass {
    constructor() {
        this.nodeTypes = {};
    }
    async init(nodeTypes) {
        for (const nodeTypeData of Object.values(nodeTypes)) {
            const applyParameters = n8n_workflow_1.NodeHelpers.getSpecialNodeParameters(nodeTypeData.type);
            if (applyParameters.length) {
                nodeTypeData.type.description.properties.unshift.apply(nodeTypeData.type.description.properties, applyParameters);
            }
        }
        this.nodeTypes = nodeTypes;
    }
    getAll() {
        return Object.values(this.nodeTypes).map((data) => data.type);
    }
    getByName(nodeType) {
        if (this.nodeTypes[nodeType] === undefined) {
            throw new Error(`The node-type "${nodeType}" is not known!`);
        }
        return this.nodeTypes[nodeType].type;
    }
}
let nodeTypesInstance;
function NodeTypes() {
    if (nodeTypesInstance === undefined) {
        nodeTypesInstance = new NodeTypesClass();
    }
    return nodeTypesInstance;
}
exports.NodeTypes = NodeTypes;
//# sourceMappingURL=NodeTypes.js.map