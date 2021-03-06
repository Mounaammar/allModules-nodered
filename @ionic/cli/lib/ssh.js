"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SSHKeyClient = exports.validatePrivateKey = exports.parsePublicKey = exports.parsePublicKeyFile = exports.getGeneratedPrivateKeyPath = exports.ERROR_SSH_INVALID_PRIVKEY = exports.ERROR_SSH_INVALID_PUBKEY = exports.ERROR_SSH_MISSING_PRIVKEY = void 0;
const utils_fs_1 = require("@ionic/utils-fs");
const os = require("os");
const path = require("path");
const guards_1 = require("../guards");
const http_1 = require("./http");
exports.ERROR_SSH_MISSING_PRIVKEY = 'SSH_MISSING_PRIVKEY';
exports.ERROR_SSH_INVALID_PUBKEY = 'SSH_INVALID_PUBKEY';
exports.ERROR_SSH_INVALID_PRIVKEY = 'SSH_INVALID_PRIVKEY';
async function getGeneratedPrivateKeyPath(userId = 0) {
    return path.resolve(os.homedir(), '.ssh', 'ionic', String(userId));
}
exports.getGeneratedPrivateKeyPath = getGeneratedPrivateKeyPath;
async function parsePublicKeyFile(pubkeyPath) {
    return parsePublicKey((await utils_fs_1.readFile(pubkeyPath, { encoding: 'utf8' })).trim());
}
exports.parsePublicKeyFile = parsePublicKeyFile;
/**
 * @return [full pubkey, algorithm, public numbers, annotation]
 */
function parsePublicKey(pubkey) {
    const r = /^(ssh-[A-z0-9]+)\s([A-z0-9+\/=]+)\s?(.+)?$/.exec(pubkey);
    if (!r) {
        throw exports.ERROR_SSH_INVALID_PUBKEY;
    }
    if (!r[3]) {
        r[3] = '';
    }
    r[1] = r[1].trim();
    r[2] = r[2].trim();
    r[3] = r[3].trim();
    return [pubkey, r[1], r[2], r[3]];
}
exports.parsePublicKey = parsePublicKey;
async function validatePrivateKey(keyPath) {
    try {
        await utils_fs_1.stat(keyPath);
    }
    catch (e) {
        if (e.code === 'ENOENT') {
            throw exports.ERROR_SSH_MISSING_PRIVKEY;
        }
        throw e;
    }
    const f = await utils_fs_1.readFile(keyPath, { encoding: 'utf8' });
    const lines = f.split('\n');
    if (!lines[0].match(/^\-{5}BEGIN [A-Z]+ PRIVATE KEY\-{5}$/)) {
        throw exports.ERROR_SSH_INVALID_PRIVKEY;
    }
}
exports.validatePrivateKey = validatePrivateKey;
class SSHKeyClient extends http_1.ResourceClient {
    constructor({ client, token, user }) {
        super();
        this.client = client;
        this.token = token;
        this.user = user;
    }
    async create({ pubkey }) {
        const { req } = await this.client.make('POST', `/users/${this.user.id}/sshkeys`);
        this.applyAuthentication(req, this.token);
        req.send({ pubkey });
        const res = await this.client.do(req);
        if (!guards_1.isSSHKeyResponse(res)) {
            throw http_1.createFatalAPIFormat(req, res);
        }
        return res.data;
    }
    async load(id) {
        const { req } = await this.client.make('GET', `/users/${this.user.id}/sshkeys/${id}`);
        this.applyAuthentication(req, this.token);
        const res = await this.client.do(req);
        if (!guards_1.isSSHKeyResponse(res)) {
            throw http_1.createFatalAPIFormat(req, res);
        }
        return res.data;
    }
    async delete(id) {
        const { req } = await this.client.make('DELETE', `/users/${this.user.id}/sshkeys/${id}`);
        this.applyAuthentication(req, this.token);
        await this.client.do(req);
    }
    paginate(args = {}) {
        return this.client.paginate({
            reqgen: async () => {
                const { req } = await this.client.make('GET', `/users/${this.user.id}/sshkeys`);
                this.applyAuthentication(req, this.token);
                return { req };
            },
            guard: guards_1.isSSHKeyListResponse,
        });
    }
}
exports.SSHKeyClient = SSHKeyClient;
