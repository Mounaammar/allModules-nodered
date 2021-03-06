"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityClient = void 0;
const guards_1 = require("../guards");
const http_1 = require("./http");
class SecurityClient extends http_1.ResourceClient {
    constructor({ client, token }) {
        super();
        this.client = client;
        this.token = token;
    }
    async load(tag) {
        const { req } = await this.client.make('GET', `/security/profiles/${tag}`);
        this.applyAuthentication(req, this.token);
        req.query({}).send();
        const res = await this.client.do(req);
        if (!guards_1.isSecurityProfileResponse(res)) {
            throw http_1.createFatalAPIFormat(req, res);
        }
        return res.data;
    }
}
exports.SecurityClient = SecurityClient;
