"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInstance = exports.Push = void 0;
const sseChannel = require("sse-channel");
const n8n_workflow_1 = require("n8n-workflow");
class Push {
    constructor() {
        this.connections = {};
        this.channel = new sseChannel({
            cors: {
                origins: ['http://localhost:8080'],
            },
        });
        this.channel.on('disconnect', (channel, res) => {
            if (res.req !== undefined) {
                n8n_workflow_1.LoggerProxy.debug(`Remove editor-UI session`, { sessionId: res.req.query.sessionId });
                delete this.connections[res.req.query.sessionId];
            }
        });
    }
    add(sessionId, req, res) {
        n8n_workflow_1.LoggerProxy.debug(`Add editor-UI session`, { sessionId });
        if (this.connections[sessionId] !== undefined) {
            this.connections[sessionId].end();
            this.channel.removeClient(this.connections[sessionId]);
        }
        this.connections[sessionId] = res;
        this.channel.addClient(req, res);
    }
    send(type, data, sessionId) {
        if (sessionId !== undefined && this.connections[sessionId] === undefined) {
            n8n_workflow_1.LoggerProxy.error(`The session "${sessionId}" is not registred.`, { sessionId });
            return;
        }
        n8n_workflow_1.LoggerProxy.debug(`Send data of type "${type}" to editor-UI`, { dataType: type, sessionId });
        const sendData = {
            type,
            data,
        };
        if (sessionId === undefined) {
            this.channel.send(JSON.stringify(sendData));
        }
        else {
            this.channel.send(JSON.stringify(sendData), [this.connections[sessionId]]);
        }
    }
}
exports.Push = Push;
let activePushInstance;
function getInstance() {
    if (activePushInstance === undefined) {
        activePushInstance = new Push();
    }
    return activePushInstance;
}
exports.getInstance = getInstance;
//# sourceMappingURL=Push.js.map