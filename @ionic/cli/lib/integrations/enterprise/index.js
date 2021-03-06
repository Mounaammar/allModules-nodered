"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Integration = exports.EnterpriseIntegrationConfig = void 0;
const cli_framework_1 = require("@ionic/cli-framework");
const cli_framework_prompts_1 = require("@ionic/cli-framework-prompts");
const utils_fs_1 = require("@ionic/utils-fs");
const lodash = require("lodash");
const path = require("path");
const __1 = require("../");
const guards_1 = require("../../../guards");
const color_1 = require("../../color");
const errors_1 = require("../../errors");
const CHOICE_CREATE_NEW_APP = 'createNewApp';
class EnterpriseIntegrationConfig extends cli_framework_1.BaseConfig {
    provideDefaults(c) {
        return {};
    }
}
exports.EnterpriseIntegrationConfig = EnterpriseIntegrationConfig;
class Integration extends __1.BaseIntegration {
    constructor() {
        super(...arguments);
        this.name = 'enterprise';
        this.summary = 'Ionic Enterprise Edition provides premier native solutions, UI, & support for companies building cross-platform apps.';
        this.archiveUrl = undefined;
    }
    async enable(config) {
        const baseConfig = config && config.root ? { root: config.root } : undefined;
        await this.updateNPMRC();
        return super.enable(baseConfig);
    }
    async add(details) {
        let productKey = this.config.get('productKey');
        let appId = this.config.get('appId');
        if (details.enableArgs) {
            const parsedArgs = cli_framework_1.parseArgs(details.enableArgs, { string: ['app-id', 'key'] });
            appId = parsedArgs['app-id'];
            productKey = parsedArgs['key'];
        }
        if (!productKey) {
            productKey = await this.e.prompt({
                type: 'input',
                name: 'product-key',
                message: 'Please enter your product key:',
            });
        }
        const keyInfo = await this.validatePK(productKey, appId);
        for (const entry of lodash.entries(keyInfo)) {
            const [key, value] = entry;
            this.config.set(key, value);
        }
        return super.add(details);
    }
    async validatePK(pk, appId) {
        let key = await this.getPK(pk);
        if (!key.app || appId) {
            if (!key.org) {
                // temporary error until we make possible to link the key to an app for personal accounts
                throw new errors_1.FatalException('No App attached to key. Please contact support@ionic.io');
            }
            if (!appId) {
                appId = await this.chooseAppToLink(key.org);
            }
            key = await this.registerKey(key, appId);
        }
        return {
            keyId: key.id,
            productKey: key.key,
            appId: key.app.id,
            orgId: key.org ? key.org.id : undefined,
            registries: key.registries,
        };
    }
    async chooseAppToLink(org) {
        const appClient = await this.getAppClient();
        const paginator = appClient.paginate({}, org.id);
        const apps = [];
        for (const r of paginator) {
            const res = await r;
            apps.push(...res.data);
        }
        let appId = await this.chooseApp(apps, org);
        if (appId === CHOICE_CREATE_NEW_APP) {
            appId = await this.createNewApp(org);
        }
        return appId;
    }
    async registerKey(key, appId) {
        const token = await this.e.session.getUserToken();
        const { req } = await this.e.client.make('PATCH', `/orgs/${key.org.id}/keys/${key.id}`);
        req.set('Authorization', `Bearer ${token}`);
        req.send({ app_id: appId });
        try {
            const res = await this.e.client.do(req);
            return res.data;
        }
        catch (e) {
            if (guards_1.isSuperAgentError(e)) {
                if (e.response.status === 401 || e.response.status === 403) {
                    throw new errors_1.FatalException('Authorization Failed. Make sure you\'re logged into the correct account with access to the key. Try logging out and back in again.');
                }
                const apiErrorMessage = (e.response.body.error && e.response.body.error.message) ? e.response.body.error.message : 'Api Error';
                throw new errors_1.FatalException(`Unable to Register Key: ` + apiErrorMessage);
            }
            else {
                throw e;
            }
        }
    }
    async getAppClient() {
        const { AppClient } = await Promise.resolve().then(() => require('../../../lib/app'));
        const token = await this.e.session.getUserToken();
        return new AppClient(token, this.e);
    }
    async createNewApp(org) {
        const appName = await this.e.prompt({
            type: 'input',
            name: 'appName',
            message: 'Please enter the name of your app:',
        });
        const appClient = await this.getAppClient();
        const newApp = await appClient.create({ org_id: org.id, name: appName });
        return newApp.id;
    }
    async chooseApp(apps, org) {
        const { formatName } = await Promise.resolve().then(() => require('../../../lib/app'));
        const newAppChoice = {
            name: color_1.strong('Create A New App'),
            id: CHOICE_CREATE_NEW_APP,
            value: CHOICE_CREATE_NEW_APP,
            org,
        };
        const linkedApp = await this.e.prompt({
            type: 'list',
            name: 'linkedApp',
            message: 'This key needs to be registered to an app. Which app would you like to register it to?',
            choices: [
                ...apps.map(app => ({
                    name: `${formatName(app)} ${color_1.weak(`(${app.id})`)}`,
                    value: app.id,
                })),
                cli_framework_prompts_1.createPromptChoiceSeparator(),
                newAppChoice,
                cli_framework_prompts_1.createPromptChoiceSeparator(),
            ],
        });
        return linkedApp;
    }
    async getPK(pk) {
        const token = await this.e.session.getUserToken();
        const { req } = await this.e.client.make('GET', '/keys/self');
        req.set('Authorization', `Bearer ${token}`).set('Product-Key-ID', pk);
        try {
            const res = await this.e.client.do(req);
            return res.data;
        }
        catch (e) {
            if (guards_1.isSuperAgentError(e)) {
                if (e.response.status === 401 || e.response.status === 403) {
                    throw new errors_1.FatalException('Authorization Failed. Make sure you\'re logged into the correct account with access to the key. Try logging out and back in again.');
                }
                if (e.response.status === 404) {
                    throw new errors_1.FatalException('Invalid Product Key');
                }
                const apiErrorMessage = (e.response.body.error && e.response.body.error.message) ? e.response.body.error.message : 'Api Error';
                throw new errors_1.FatalException(`Unable to Add Integration: ` + apiErrorMessage);
            }
            else {
                throw e;
            }
        }
    }
    async updateNPMRC() {
        const pk = this.config.get('productKey');
        const registries = this.config.get('registries');
        if (!pk || !registries) {
            throw new errors_1.FatalException('Enterprise config invalid');
        }
        let npmrc = '';
        try {
            npmrc = await utils_fs_1.readFile(path.join(this.e.project.directory, '.npmrc'), 'utf8');
        }
        catch (e) {
            if (!e.message.includes('ENOENT')) {
                throw e;
            }
        }
        for (const entry of registries) {
            const [scope, url] = entry.split(';');
            const urlNoProt = url.split(':').splice(1).join(':');
            const scopeRegex = new RegExp(`${scope}:registry.*\\n?`, 'g');
            const urlRegex = new RegExp(`${urlNoProt}:_authToken.*\\n?`, 'g');
            const newScope = `${scope}:registry=${url}\n`;
            const newUrl = `${urlNoProt}:_authToken=${pk}\n`;
            if (npmrc.match(scopeRegex)) {
                npmrc = npmrc.replace(scopeRegex, newScope);
            }
            else {
                npmrc += newScope;
            }
            if (npmrc.match(urlRegex)) {
                npmrc = npmrc.replace(urlRegex, newUrl);
            }
            else {
                npmrc += newUrl;
            }
        }
        await utils_fs_1.writeFile(path.join(this.e.project.directory, `.npmrc`), npmrc, { encoding: 'utf8' });
    }
    get config() {
        return new EnterpriseIntegrationConfig(this.e.project.filePath, { pathPrefix: [...this.e.project.pathPrefix, 'integrations', this.name] });
    }
}
exports.Integration = Integration;
