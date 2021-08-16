"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.start = exports.registerProductionWebhooks = void 0;
const express = require("express");
const fs_1 = require("fs");
const typeorm_1 = require("typeorm");
const bodyParser = require("body-parser");
require('body-parser-xml')(bodyParser);
const _1 = require("./");
const compression = require("compression");
const config = require("../config");
const parseUrl = require("parseurl");
function registerProductionWebhooks() {
    this.app.head(`/${this.endpointWebhook}/*`, async (req, res) => {
        const requestUrl = req.parsedUrl.pathname.slice(this.endpointWebhook.length + 2);
        let response;
        try {
            response = await this.activeWorkflowRunner.executeWebhook('HEAD', requestUrl, req, res);
        }
        catch (error) {
            _1.ResponseHelper.sendErrorResponse(res, error);
            return;
        }
        if (response.noWebhookResponse === true) {
            return;
        }
        _1.ResponseHelper.sendSuccessResponse(res, response.data, true, response.responseCode);
    });
    this.app.options(`/${this.endpointWebhook}/*`, async (req, res) => {
        const requestUrl = req.parsedUrl.pathname.slice(this.endpointWebhook.length + 2);
        let allowedMethods;
        try {
            allowedMethods = await this.activeWorkflowRunner.getWebhookMethods(requestUrl);
            allowedMethods.push('OPTIONS');
            res.append('Allow', allowedMethods);
        }
        catch (error) {
            _1.ResponseHelper.sendErrorResponse(res, error);
            return;
        }
        _1.ResponseHelper.sendSuccessResponse(res, {}, true, 204);
    });
    this.app.get(`/${this.endpointWebhook}/*`, async (req, res) => {
        const requestUrl = req.parsedUrl.pathname.slice(this.endpointWebhook.length + 2);
        let response;
        try {
            response = await this.activeWorkflowRunner.executeWebhook('GET', requestUrl, req, res);
        }
        catch (error) {
            _1.ResponseHelper.sendErrorResponse(res, error);
            return;
        }
        if (response.noWebhookResponse === true) {
            return;
        }
        _1.ResponseHelper.sendSuccessResponse(res, response.data, true, response.responseCode);
    });
    this.app.post(`/${this.endpointWebhook}/*`, async (req, res) => {
        const requestUrl = req.parsedUrl.pathname.slice(this.endpointWebhook.length + 2);
        let response;
        try {
            response = await this.activeWorkflowRunner.executeWebhook('POST', requestUrl, req, res);
        }
        catch (error) {
            _1.ResponseHelper.sendErrorResponse(res, error);
            return;
        }
        if (response.noWebhookResponse === true) {
            return;
        }
        _1.ResponseHelper.sendSuccessResponse(res, response.data, true, response.responseCode);
    });
}
exports.registerProductionWebhooks = registerProductionWebhooks;
class App {
    constructor() {
        this.app = express();
        this.endpointWebhook = config.get('endpoints.webhook');
        this.saveDataErrorExecution = config.get('executions.saveDataOnError');
        this.saveDataSuccessExecution = config.get('executions.saveDataOnSuccess');
        this.saveManualExecutions = config.get('executions.saveDataManualExecutions');
        this.executionTimeout = config.get('executions.timeout');
        this.maxExecutionTimeout = config.get('executions.maxTimeout');
        this.timezone = config.get('generic.timezone');
        this.restEndpoint = config.get('endpoints.rest');
        this.activeWorkflowRunner = _1.ActiveWorkflowRunner.getInstance();
        this.activeExecutionsInstance = _1.ActiveExecutions.getInstance();
        this.protocol = config.get('protocol');
        this.sslKey = config.get('ssl_key');
        this.sslCert = config.get('ssl_cert');
        this.externalHooks = _1.ExternalHooks();
        this.presetCredentialsLoaded = false;
        this.endpointPresetCredentials = config.get('credentials.overwrite.endpoint');
    }
    getCurrentDate() {
        return new Date();
    }
    async config() {
        this.versions = await _1.GenericHelpers.getVersions();
        this.app.use(compression());
        this.app.use((req, res, next) => {
            req.parsedUrl = parseUrl(req);
            req.rawBody = Buffer.from('', 'base64');
            next();
        });
        this.app.use(bodyParser.json({
            limit: '16mb', verify: (req, res, buf) => {
                req.rawBody = buf;
            },
        }));
        this.app.use(bodyParser.xml({
            limit: '16mb', xmlParseOptions: {
                normalize: true,
                normalizeTags: true,
                explicitArray: false,
            },
        }));
        this.app.use(bodyParser.text({
            limit: '16mb', verify: (req, res, buf) => {
                req.rawBody = buf;
            },
        }));
        this.app.use(bodyParser.urlencoded({ extended: false,
            verify: (req, res, buf) => {
                req.rawBody = buf;
            },
        }));
        if (process.env['NODE_ENV'] !== 'production') {
            this.app.use((req, res, next) => {
                res.header('Access-Control-Allow-Origin', 'http://localhost:8080');
                res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
                res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, sessionid');
                next();
            });
        }
        this.app.use((req, res, next) => {
            if (_1.Db.collections.Workflow === null) {
                const error = new _1.ResponseHelper.ResponseError('Database is not ready!', undefined, 503);
                return _1.ResponseHelper.sendErrorResponse(res, error);
            }
            next();
        });
        this.app.get('/healthz', async (req, res) => {
            const connectionManager = typeorm_1.getConnectionManager();
            if (connectionManager.connections.length === 0) {
                const error = new _1.ResponseHelper.ResponseError('No Database connection found!', undefined, 503);
                return _1.ResponseHelper.sendErrorResponse(res, error);
            }
            if (connectionManager.connections[0].isConnected === false) {
                const error = new _1.ResponseHelper.ResponseError('Database connection not active!', undefined, 503);
                return _1.ResponseHelper.sendErrorResponse(res, error);
            }
            const responseData = {
                status: 'ok',
            };
            _1.ResponseHelper.sendSuccessResponse(res, responseData, true, 200);
        });
        registerProductionWebhooks.apply(this);
    }
}
async function start() {
    const PORT = config.get('port');
    const ADDRESS = config.get('listen_address');
    const app = new App();
    await app.config();
    let server;
    if (app.protocol === 'https' && app.sslKey && app.sslCert) {
        const https = require('https');
        const privateKey = fs_1.readFileSync(app.sslKey, 'utf8');
        const cert = fs_1.readFileSync(app.sslCert, 'utf8');
        const credentials = { key: privateKey, cert };
        server = https.createServer(credentials, app.app);
    }
    else {
        const http = require('http');
        server = http.createServer(app.app);
    }
    server.listen(PORT, ADDRESS, async () => {
        const versions = await _1.GenericHelpers.getVersions();
        console.log(`n8n ready on ${ADDRESS}, port ${PORT}`);
        console.log(`Version: ${versions.cli}`);
        await app.externalHooks.run('n8n.ready', [app]);
    });
}
exports.start = start;
//# sourceMappingURL=WebhookServer.js.map