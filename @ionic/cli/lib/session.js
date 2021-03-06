"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.promptToSignup = exports.promptToLogin = exports.ProSession = exports.BaseSession = void 0;
const guards_1 = require("../guards");
const color_1 = require("./color");
const errors_1 = require("./errors");
const http_1 = require("./http");
const open_1 = require("./open");
class BaseSession {
    constructor(e) {
        this.e = e;
    }
    async logout() {
        const activeToken = this.e.config.get('tokens.user');
        if (activeToken) {
            // invalidate the token
            const { req } = await this.e.client.make('POST', '/logout');
            req.set('Authorization', `Bearer ${activeToken}`)
                .send({});
            try {
                await this.e.client.do(req);
            }
            catch (e) { }
        }
        this.e.config.unset('org.id');
        this.e.config.unset('user.id');
        this.e.config.unset('user.email');
        this.e.config.unset('tokens.user');
        this.e.config.unset('tokens.refresh');
        this.e.config.unset('tokens.expiresInSeconds');
        this.e.config.unset('tokens.issuedOn');
        this.e.config.unset('tokens.flowName');
        this.e.config.set('git.setup', false);
    }
    isLoggedIn() {
        return typeof this.e.config.get('tokens.user') === 'string';
    }
    getUser() {
        const userId = this.e.config.get('user.id');
        if (!userId) {
            throw new errors_1.SessionException(`Oops, sorry! You'll need to log in:\n    ${color_1.input('ionic login')}\n\n` +
                `You can create a new account by signing up:\n\n    ${color_1.input('ionic signup')}\n`);
        }
        return { id: userId };
    }
}
exports.BaseSession = BaseSession;
class ProSession extends BaseSession {
    async getUserToken() {
        let userToken = this.e.config.get('tokens.user');
        if (!userToken) {
            throw new errors_1.SessionException(`Oops, sorry! You'll need to log in:\n    ${color_1.input('ionic login')}\n\n` +
                `You can create a new account by signing up:\n\n    ${color_1.input('ionic signup')}\n`);
        }
        const tokenIssuedOn = this.e.config.get('tokens.issuedOn');
        const tokenExpirationSeconds = this.e.config.get('tokens.expiresInSeconds');
        const refreshToken = this.e.config.get('tokens.refresh');
        const flowName = this.e.config.get('tokens.flowName');
        // if there is the possibility to refresh the token, try to do it
        if (tokenIssuedOn && tokenExpirationSeconds && refreshToken && flowName) {
            if (!this.isTokenValid(tokenIssuedOn, tokenExpirationSeconds)) {
                userToken = await this.refreshLogin(refreshToken, flowName);
            }
        }
        // otherwise simply return the token
        return userToken;
    }
    isTokenValid(tokenIssuedOn, tokenExpirationSeconds) {
        const tokenExpirationMilliSeconds = tokenExpirationSeconds * 1000;
        // 15 minutes in milliseconds of margin
        const marginExpiration = 15 * 60 * 1000;
        const tokenValid = new Date() < new Date(new Date(tokenIssuedOn).getTime() + tokenExpirationMilliSeconds - marginExpiration);
        return tokenValid;
    }
    async login(email, password) {
        const { req } = await this.e.client.make('POST', '/login');
        req.send({ email, password, source: 'cli' });
        try {
            const res = await this.e.client.do(req);
            if (!guards_1.isLoginResponse(res)) {
                const data = res.data;
                if (hasTokenAttribute(data)) {
                    data.token = '*****';
                }
                throw new errors_1.FatalException('API request was successful, but the response format was unrecognized.\n' +
                    http_1.formatResponseError(req, res.meta.status, data));
            }
            const { token, user } = res.data;
            if (this.e.config.get('user.id') !== user.id) { // User changed
                await this.logout();
            }
            this.e.config.set('user.id', user.id);
            this.e.config.set('user.email', email);
            this.e.config.set('tokens.user', token);
        }
        catch (e) {
            if (guards_1.isSuperAgentError(e) && (e.response.status === 401 || e.response.status === 403)) {
                throw new errors_1.SessionException('Incorrect email or password.');
            }
            throw e;
        }
    }
    async ssoLogin(email) {
        await this.webLogin();
    }
    async tokenLogin(token) {
        const { UserClient } = await Promise.resolve().then(() => require('./user'));
        const userClient = new UserClient(token, this.e);
        try {
            const user = await userClient.loadSelf();
            const user_id = user.id;
            if (this.e.config.get('user.id') !== user_id) { // User changed
                await this.logout();
            }
            this.e.config.set('user.id', user_id);
            this.e.config.set('user.email', user.email);
            this.e.config.set('tokens.user', token);
        }
        catch (e) {
            if (guards_1.isSuperAgentError(e) && (e.response.status === 401 || e.response.status === 403)) {
                throw new errors_1.SessionException('Invalid auth token.');
            }
            throw e;
        }
    }
    async webLogin() {
        const { OpenIDFlow } = await Promise.resolve().then(() => require('./oauth/openid'));
        const flow = new OpenIDFlow({}, this.e);
        const token = await flow.run();
        await this.tokenLogin(token.access_token);
        this.e.config.set('tokens.refresh', token.refresh_token);
        this.e.config.set('tokens.expiresInSeconds', token.expires_in);
        this.e.config.set('tokens.issuedOn', (new Date()).toJSON());
        this.e.config.set('tokens.flowName', flow.flowName);
    }
    async refreshLogin(refreshToken, flowName) {
        let oauthflow;
        // having a generic way to access the right refresh token flow
        switch (flowName) {
            case 'open_id':
                const { OpenIDFlow } = await Promise.resolve().then(() => require('./oauth/openid'));
                oauthflow = new OpenIDFlow({}, this.e);
                break;
            default:
                oauthflow = undefined;
        }
        if (!oauthflow) {
            throw new errors_1.FatalException('Token cannot be refreshed');
        }
        const token = await oauthflow.exchangeRefreshToken(refreshToken);
        await this.tokenLogin(token.access_token);
        this.e.config.set('tokens.expiresInSeconds', token.expires_in);
        this.e.config.set('tokens.issuedOn', (new Date()).toJSON());
        return token.access_token;
    }
}
exports.ProSession = ProSession;
async function promptToLogin(env) {
    env.log.nl();
    env.log.msg(`Log in to your Ionic account!\n` +
        `If you don't have one yet, create yours by running: ${color_1.input(`ionic signup`)}\n`);
    const login = await env.prompt({
        type: 'confirm',
        name: 'login',
        message: 'Open the browser to log in to your Ionic account?',
        default: true,
    });
    if (login) {
        await env.session.webLogin();
    }
}
exports.promptToLogin = promptToLogin;
async function promptToSignup(env) {
    env.log.nl();
    env.log.msg(`Join the Ionic Community! ????\n` +
        `Connect with millions of developers on the Ionic Forum and get access to live events, news updates, and more.\n\n`);
    const create = await env.prompt({
        type: 'confirm',
        name: 'create',
        message: 'Create free Ionic account?',
        default: false,
    });
    if (create) {
        const dashUrl = env.config.getDashUrl();
        await open_1.openUrl(`${dashUrl}/signup?source=cli`);
    }
}
exports.promptToSignup = promptToSignup;
function hasTokenAttribute(r) {
    return r && typeof r === 'object' && typeof r.token === 'string';
}
