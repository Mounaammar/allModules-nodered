"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SnapshotClient = void 0;
const guards_1 = require("../guards");
const http_1 = require("./http");
class SnapshotClient extends http_1.ResourceClient {
    constructor({ client, app, token }) {
        super();
        this.client = client;
        this.token = token;
        this.app = app;
    }
    async load(id) {
        const { req } = await this.client.make('GET', `/apps/${this.app.id}/snapshots/${id}`);
        this.applyAuthentication(req, this.token);
        const res = await this.client.do(req);
        if (!guards_1.isSnapshotResponse(res)) {
            throw http_1.createFatalAPIFormat(req, res);
        }
        return res.data;
    }
    paginate(args = {}) {
        return this.client.paginate({
            reqgen: async () => {
                const { req } = await this.client.make('GET', `/apps/${this.app.id}/snapshots`);
                this.applyAuthentication(req, this.token);
                return { req };
            },
            guard: guards_1.isSnapshotListResponse,
        });
    }
}
exports.SnapshotClient = SnapshotClient;
