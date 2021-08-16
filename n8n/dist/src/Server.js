"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.start = void 0;
const express = require("express");
const fs_1 = require("fs");
const path_1 = require("path");
const typeorm_1 = require("typeorm");
const bodyParser = require("body-parser");
require('body-parser-xml')(bodyParser);
const history = require("connect-history-api-fallback");
const _ = require("lodash");
const clientOAuth2 = require("client-oauth2");
const clientOAuth1 = require("oauth-1.0a");
const csrf = require("csrf");
const requestPromise = require("request-promise-native");
const crypto_1 = require("crypto");
const bcryptjs_1 = require("bcryptjs");
const promClient = require("prom-client");
const _1 = require("./");
const n8n_core_1 = require("n8n-core");
const n8n_workflow_1 = require("n8n-workflow");
const typeorm_2 = require("typeorm");
const basicAuth = require("basic-auth");
const compression = require("compression");
const config = require("../config");
const jwt = require("jsonwebtoken");
const jwks = require("jwks-rsa");
const timezones = require("google-timezones-json");
const parseUrl = require("parseurl");
const querystring = require("querystring");
const Queue = require("../src/Queue");
const TagHelpers = require("./TagHelpers");
const TagEntity_1 = require("./databases/entities/TagEntity");
const WorkflowEntity_1 = require("./databases/entities/WorkflowEntity");
class App {
    constructor() {
        this.app = express();
        this.endpointWebhook = config.get('endpoints.webhook');
        this.endpointWebhookTest = config.get('endpoints.webhookTest');
        this.defaultWorkflowName = config.get('workflows.defaultName');
        this.saveDataErrorExecution = config.get('executions.saveDataOnError');
        this.saveDataSuccessExecution = config.get('executions.saveDataOnSuccess');
        this.saveManualExecutions = config.get('executions.saveDataManualExecutions');
        this.executionTimeout = config.get('executions.timeout');
        this.maxExecutionTimeout = config.get('executions.maxTimeout');
        this.payloadSizeMax = config.get('endpoints.payloadSizeMax');
        this.timezone = config.get('generic.timezone');
        this.restEndpoint = config.get('endpoints.rest');
        this.activeWorkflowRunner = _1.ActiveWorkflowRunner.getInstance();
        this.testWebhooks = _1.TestWebhooks.getInstance();
        this.push = _1.Push.getInstance();
        this.activeExecutionsInstance = _1.ActiveExecutions.getInstance();
        this.protocol = config.get('protocol');
        this.sslKey = config.get('ssl_key');
        this.sslCert = config.get('ssl_cert');
        this.externalHooks = _1.ExternalHooks();
        this.presetCredentialsLoaded = false;
        this.endpointPresetCredentials = config.get('credentials.overwrite.endpoint');
        const urlBaseWebhook = _1.WebhookHelpers.getWebhookBaseUrl();
        this.frontendSettings = {
            endpointWebhook: this.endpointWebhook,
            endpointWebhookTest: this.endpointWebhookTest,
            saveDataErrorExecution: this.saveDataErrorExecution,
            saveDataSuccessExecution: this.saveDataSuccessExecution,
            saveManualExecutions: this.saveManualExecutions,
            executionTimeout: this.executionTimeout,
            maxExecutionTimeout: this.maxExecutionTimeout,
            timezone: this.timezone,
            urlBaseWebhook,
            versionCli: '',
            oauthCallbackUrls: {
                'oauth1': urlBaseWebhook + `${this.restEndpoint}/oauth1-credential/callback`,
                'oauth2': urlBaseWebhook + `${this.restEndpoint}/oauth2-credential/callback`,
            },
        };
    }
    getCurrentDate() {
        return new Date();
    }
    async config() {
        const enableMetrics = config.get('endpoints.metrics.enable');
        let register;
        if (enableMetrics === true) {
            const prefix = config.get('endpoints.metrics.prefix');
            register = new promClient.Registry();
            register.setDefaultLabels({ prefix });
            promClient.collectDefaultMetrics({ register });
        }
        this.versions = await _1.GenericHelpers.getVersions();
        this.frontendSettings.versionCli = this.versions.cli;
        await this.externalHooks.run('frontend.settings', [this.frontendSettings]);
        const excludeEndpoints = config.get('security.excludeEndpoints');
        const ignoredEndpoints = ['healthz', 'metrics', this.endpointWebhook, this.endpointWebhookTest, this.endpointPresetCredentials];
        ignoredEndpoints.push.apply(ignoredEndpoints, excludeEndpoints.split(':'));
        const authIgnoreRegex = new RegExp(`^\/(${_(ignoredEndpoints).compact().join('|')})\/?.*$`);
        const basicAuthActive = config.get('security.basicAuth.active');
        if (basicAuthActive === true) {
            const basicAuthUser = await _1.GenericHelpers.getConfigValue('security.basicAuth.user');
            if (basicAuthUser === '') {
                throw new Error('Basic auth is activated but no user got defined. Please set one!');
            }
            const basicAuthPassword = await _1.GenericHelpers.getConfigValue('security.basicAuth.password');
            if (basicAuthPassword === '') {
                throw new Error('Basic auth is activated but no password got defined. Please set one!');
            }
            const basicAuthHashEnabled = await _1.GenericHelpers.getConfigValue('security.basicAuth.hash');
            let validPassword = null;
            this.app.use(async (req, res, next) => {
                if (req.url.match(authIgnoreRegex)) {
                    return next();
                }
                const realm = 'n8n - Editor UI';
                const basicAuthData = basicAuth(req);
                if (basicAuthData === undefined) {
                    return _1.ResponseHelper.basicAuthAuthorizationError(res, realm, 'Authorization is required!');
                }
                if (basicAuthData.name === basicAuthUser) {
                    if (basicAuthHashEnabled === true) {
                        if (validPassword === null && await bcryptjs_1.compare(basicAuthData.pass, basicAuthPassword)) {
                            validPassword = basicAuthData.pass;
                        }
                        if (validPassword === basicAuthData.pass && validPassword !== null) {
                            return next();
                        }
                    }
                    else {
                        if (basicAuthData.pass === basicAuthPassword) {
                            return next();
                        }
                    }
                }
                return _1.ResponseHelper.basicAuthAuthorizationError(res, realm, 'Authorization data is wrong!');
            });
        }
        const jwtAuthActive = config.get('security.jwtAuth.active');
        if (jwtAuthActive === true) {
            const jwtAuthHeader = await _1.GenericHelpers.getConfigValue('security.jwtAuth.jwtHeader');
            if (jwtAuthHeader === '') {
                throw new Error('JWT auth is activated but no request header was defined. Please set one!');
            }
            const jwksUri = await _1.GenericHelpers.getConfigValue('security.jwtAuth.jwksUri');
            if (jwksUri === '') {
                throw new Error('JWT auth is activated but no JWK Set URI was defined. Please set one!');
            }
            const jwtHeaderValuePrefix = await _1.GenericHelpers.getConfigValue('security.jwtAuth.jwtHeaderValuePrefix');
            const jwtIssuer = await _1.GenericHelpers.getConfigValue('security.jwtAuth.jwtIssuer');
            const jwtNamespace = await _1.GenericHelpers.getConfigValue('security.jwtAuth.jwtNamespace');
            const jwtAllowedTenantKey = await _1.GenericHelpers.getConfigValue('security.jwtAuth.jwtAllowedTenantKey');
            const jwtAllowedTenant = await _1.GenericHelpers.getConfigValue('security.jwtAuth.jwtAllowedTenant');
            function isTenantAllowed(decodedToken) {
                if (jwtNamespace === '' || jwtAllowedTenantKey === '' || jwtAllowedTenant === '')
                    return true;
                else {
                    for (const [k, v] of Object.entries(decodedToken)) {
                        if (k === jwtNamespace) {
                            for (const [kn, kv] of Object.entries(v)) {
                                if (kn === jwtAllowedTenantKey && kv === jwtAllowedTenant) {
                                    return true;
                                }
                            }
                        }
                    }
                }
                return false;
            }
            this.app.use((req, res, next) => {
                if (req.url.match(authIgnoreRegex)) {
                    return next();
                }
                let token = req.header(jwtAuthHeader);
                if (token === undefined || token === '') {
                    return _1.ResponseHelper.jwtAuthAuthorizationError(res, "Missing token");
                }
                if (jwtHeaderValuePrefix !== '' && token.startsWith(jwtHeaderValuePrefix)) {
                    token = token.replace(jwtHeaderValuePrefix + ' ', '').trimLeft();
                }
                const jwkClient = jwks({ cache: true, jwksUri });
                function getKey(header, callback) {
                    jwkClient.getSigningKey(header.kid, (err, key) => {
                        if (err)
                            throw _1.ResponseHelper.jwtAuthAuthorizationError(res, err.message);
                        const signingKey = key.publicKey || key.rsaPublicKey;
                        callback(null, signingKey);
                    });
                }
                const jwtVerifyOptions = {
                    issuer: jwtIssuer !== '' ? jwtIssuer : undefined,
                    ignoreExpiration: false,
                };
                jwt.verify(token, getKey, jwtVerifyOptions, (err, decoded) => {
                    if (err)
                        _1.ResponseHelper.jwtAuthAuthorizationError(res, 'Invalid token');
                    else if (!isTenantAllowed(decoded))
                        _1.ResponseHelper.jwtAuthAuthorizationError(res, 'Tenant not allowed');
                    else
                        next();
                });
            });
        }
        this.app.use((req, res, next) => {
            if (req.url.indexOf(`/${this.restEndpoint}/push`) === 0) {
                if (req.query.sessionId === undefined) {
                    next(new Error('The query parameter "sessionId" is missing!'));
                    return;
                }
                this.push.add(req.query.sessionId, req, res);
                return;
            }
            next();
        });
        this.app.use(compression());
        this.app.use((req, res, next) => {
            req.parsedUrl = parseUrl(req);
            req.rawBody = Buffer.from('', 'base64');
            next();
        });
        this.app.use(bodyParser.json({
            limit: this.payloadSizeMax + 'mb', verify: (req, res, buf) => {
                req.rawBody = buf;
            },
        }));
        this.app.use(bodyParser.xml({
            limit: this.payloadSizeMax + 'mb', xmlParseOptions: {
                normalize: true,
                normalizeTags: true,
                explicitArray: false,
            },
        }));
        this.app.use(bodyParser.text({
            limit: this.payloadSizeMax + 'mb', verify: (req, res, buf) => {
                req.rawBody = buf;
            },
        }));
        this.app.use(history({
            rewrites: [
                {
                    from: new RegExp(`^\/(${this.restEndpoint}|healthz|metrics|css|js|${this.endpointWebhook}|${this.endpointWebhookTest})\/?.*$`),
                    to: (context) => {
                        return context.parsedUrl.pathname.toString();
                    },
                },
            ],
        }));
        this.app.use(bodyParser.urlencoded({
            extended: false,
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
        if (enableMetrics === true) {
            this.app.get('/metrics', async (req, res) => {
                const response = await register.metrics();
                res.setHeader('Content-Type', register.contentType);
                _1.ResponseHelper.sendSuccessResponse(res, response, true, 200);
            });
        }
        this.app.post(`/${this.restEndpoint}/workflows`, _1.ResponseHelper.send(async (req, res) => {
            delete req.body.id;
            const incomingData = req.body;
            const newWorkflow = new WorkflowEntity_1.WorkflowEntity();
            Object.assign(newWorkflow, incomingData);
            newWorkflow.name = incomingData.name.trim();
            const incomingTagOrder = incomingData.tags.slice();
            if (incomingData.tags.length) {
                newWorkflow.tags = await _1.Db.collections.Tag.findByIds(incomingData.tags, { select: ['id', 'name'] });
            }
            await this.externalHooks.run('workflow.create', [newWorkflow]);
            await _1.WorkflowHelpers.validateWorkflow(newWorkflow);
            const savedWorkflow = await _1.Db.collections.Workflow.save(newWorkflow).catch(_1.WorkflowHelpers.throwDuplicateEntryError);
            savedWorkflow.tags = TagHelpers.sortByRequestOrder(savedWorkflow.tags, incomingTagOrder);
            savedWorkflow.id = savedWorkflow.id.toString();
            return savedWorkflow;
        }));
        this.app.get(`/${this.restEndpoint}/workflows/from-url`, _1.ResponseHelper.send(async (req, res) => {
            if (req.query.url === undefined) {
                throw new _1.ResponseHelper.ResponseError(`The parameter "url" is missing!`, undefined, 400);
            }
            if (!req.query.url.match(/^http[s]?:\/\/.*\.json$/i)) {
                throw new _1.ResponseHelper.ResponseError(`The parameter "url" is not valid! It does not seem to be a URL pointing to a n8n workflow JSON file.`, undefined, 400);
            }
            const data = await requestPromise.get(req.query.url);
            let workflowData;
            try {
                workflowData = JSON.parse(data);
            }
            catch (error) {
                throw new _1.ResponseHelper.ResponseError(`The URL does not point to valid JSON file!`, undefined, 400);
            }
            if (workflowData === undefined || workflowData.nodes === undefined || !Array.isArray(workflowData.nodes) ||
                workflowData.connections === undefined || typeof workflowData.connections !== 'object' ||
                Array.isArray(workflowData.connections)) {
                throw new _1.ResponseHelper.ResponseError(`The data in the file does not seem to be a n8n workflow JSON file!`, undefined, 400);
            }
            return workflowData;
        }));
        this.app.get(`/${this.restEndpoint}/workflows`, _1.ResponseHelper.send(async (req, res) => {
            const findQuery = {
                select: ['id', 'name', 'active', 'createdAt', 'updatedAt'],
                relations: ['tags'],
            };
            if (req.query.filter) {
                findQuery.where = JSON.parse(req.query.filter);
            }
            const workflows = await _1.Db.collections.Workflow.find(findQuery);
            workflows.forEach(workflow => {
                workflow.id = workflow.id.toString();
                workflow.tags = workflow.tags.map(({ id, name }) => ({ id: id.toString(), name }));
            });
            return workflows;
        }));
        this.app.get(`/${this.restEndpoint}/workflows/new`, _1.ResponseHelper.send(async (req, res) => {
            const nameToReturn = req.query.name && req.query.name !== ''
                ? req.query.name
                : this.defaultWorkflowName;
            const workflows = await _1.Db.collections.Workflow.find({
                select: ['name'],
                where: { name: typeorm_1.Like(`${nameToReturn}%`) },
            });
            if (workflows.length === 0) {
                return { name: nameToReturn };
            }
            const maxSuffix = workflows.reduce((acc, { name }) => {
                const parts = name.split(`${nameToReturn} `);
                if (parts.length > 2)
                    return acc;
                const suffix = Number(parts[1]);
                if (!isNaN(suffix) && Math.ceil(suffix) > acc) {
                    acc = Math.ceil(suffix);
                }
                return acc;
            }, 0);
            if (maxSuffix === 0) {
                return { name: `${nameToReturn} 2` };
            }
            return { name: `${nameToReturn} ${maxSuffix + 1}` };
        }));
        this.app.get(`/${this.restEndpoint}/workflows/:id`, _1.ResponseHelper.send(async (req, res) => {
            const workflow = await _1.Db.collections.Workflow.findOne(req.params.id, { relations: ['tags'] });
            if (workflow === undefined) {
                return undefined;
            }
            workflow.id = workflow.id.toString();
            workflow.tags.forEach(tag => tag.id = tag.id.toString());
            return workflow;
        }));
        this.app.patch(`/${this.restEndpoint}/workflows/:id`, _1.ResponseHelper.send(async (req, res) => {
            const _a = req.body, { tags } = _a, updateData = __rest(_a, ["tags"]);
            const id = req.params.id;
            updateData.id = id;
            await this.externalHooks.run('workflow.update', [updateData]);
            const isActive = await this.activeWorkflowRunner.isActive(id);
            if (isActive) {
                await this.activeWorkflowRunner.remove(id);
            }
            if (updateData.settings) {
                if (updateData.settings.timezone === 'DEFAULT') {
                    delete updateData.settings.timezone;
                }
                if (updateData.settings.saveDataErrorExecution === 'DEFAULT') {
                    delete updateData.settings.saveDataErrorExecution;
                }
                if (updateData.settings.saveDataSuccessExecution === 'DEFAULT') {
                    delete updateData.settings.saveDataSuccessExecution;
                }
                if (updateData.settings.saveManualExecutions === 'DEFAULT') {
                    delete updateData.settings.saveManualExecutions;
                }
                if (parseInt(updateData.settings.executionTimeout, 10) === this.executionTimeout) {
                    delete updateData.settings.executionTimeout;
                }
            }
            updateData.updatedAt = this.getCurrentDate();
            await _1.WorkflowHelpers.validateWorkflow(updateData);
            await _1.Db.collections.Workflow.update(id, updateData).catch(_1.WorkflowHelpers.throwDuplicateEntryError);
            if (tags) {
                const tablePrefix = config.get('database.tablePrefix');
                await TagHelpers.removeRelations(req.params.id, tablePrefix);
                if (tags.length) {
                    await TagHelpers.createRelations(req.params.id, tags, tablePrefix);
                }
            }
            const workflow = await _1.Db.collections.Workflow.findOne(id, { relations: ['tags'] });
            if (workflow === undefined) {
                throw new _1.ResponseHelper.ResponseError(`Workflow with id "${id}" could not be found to be updated.`, undefined, 400);
            }
            if (tags === null || tags === void 0 ? void 0 : tags.length) {
                workflow.tags = TagHelpers.sortByRequestOrder(workflow.tags, tags);
            }
            await this.externalHooks.run('workflow.afterUpdate', [workflow]);
            if (workflow.active === true) {
                try {
                    await this.externalHooks.run('workflow.activate', [workflow]);
                    await this.activeWorkflowRunner.add(id, isActive ? 'update' : 'activate');
                }
                catch (error) {
                    updateData.active = false;
                    await _1.Db.collections.Workflow.update(id, updateData);
                    workflow.active = false;
                    throw error;
                }
            }
            workflow.id = workflow.id.toString();
            return workflow;
        }));
        this.app.delete(`/${this.restEndpoint}/workflows/:id`, _1.ResponseHelper.send(async (req, res) => {
            const id = req.params.id;
            await this.externalHooks.run('workflow.delete', [id]);
            const isActive = await this.activeWorkflowRunner.isActive(id);
            if (isActive) {
                await this.activeWorkflowRunner.remove(id);
            }
            await _1.Db.collections.Workflow.delete(id);
            await this.externalHooks.run('workflow.afterDelete', [id]);
            return true;
        }));
        this.app.post(`/${this.restEndpoint}/workflows/run`, _1.ResponseHelper.send(async (req, res) => {
            const workflowData = req.body.workflowData;
            const runData = req.body.runData;
            const startNodes = req.body.startNodes;
            const destinationNode = req.body.destinationNode;
            const executionMode = 'manual';
            const activationMode = 'manual';
            const sessionId = _1.GenericHelpers.getSessionId(req);
            if (runData === undefined || startNodes === undefined || startNodes.length === 0 || destinationNode === undefined) {
                const credentials = await _1.WorkflowCredentials(workflowData.nodes);
                const additionalData = await _1.WorkflowExecuteAdditionalData.getBase(credentials);
                const nodeTypes = _1.NodeTypes();
                const workflowInstance = new n8n_workflow_1.Workflow({ id: workflowData.id, name: workflowData.name, nodes: workflowData.nodes, connections: workflowData.connections, active: false, nodeTypes, staticData: undefined, settings: workflowData.settings });
                const needsWebhook = await this.testWebhooks.needsWebhookData(workflowData, workflowInstance, additionalData, executionMode, activationMode, sessionId, destinationNode);
                if (needsWebhook === true) {
                    return {
                        waitingForWebhook: true,
                    };
                }
            }
            workflowData.active = false;
            const credentials = await _1.WorkflowCredentials(workflowData.nodes);
            const data = {
                credentials,
                destinationNode,
                executionMode,
                runData,
                sessionId,
                startNodes,
                workflowData,
            };
            const workflowRunner = new _1.WorkflowRunner();
            const executionId = await workflowRunner.run(data);
            return {
                executionId,
            };
        }));
        this.app.get(`/${this.restEndpoint}/tags`, _1.ResponseHelper.send(async (req, res) => {
            if (req.query.withUsageCount === 'true') {
                const tablePrefix = config.get('database.tablePrefix');
                return TagHelpers.getTagsWithCountDb(tablePrefix);
            }
            const tags = await _1.Db.collections.Tag.find({ select: ['id', 'name'] });
            tags.forEach(tag => tag.id = tag.id.toString());
            return tags;
        }));
        this.app.post(`/${this.restEndpoint}/tags`, _1.ResponseHelper.send(async (req, res) => {
            const newTag = new TagEntity_1.TagEntity();
            newTag.name = req.body.name.trim();
            await this.externalHooks.run('tag.beforeCreate', [newTag]);
            await TagHelpers.validateTag(newTag);
            const tag = await _1.Db.collections.Tag.save(newTag).catch(TagHelpers.throwDuplicateEntryError);
            await this.externalHooks.run('tag.afterCreate', [tag]);
            tag.id = tag.id.toString();
            return tag;
        }));
        this.app.patch(`/${this.restEndpoint}/tags/:id`, _1.ResponseHelper.send(async (req, res) => {
            const { name } = req.body;
            const { id } = req.params;
            const newTag = new TagEntity_1.TagEntity();
            newTag.id = Number(id);
            newTag.name = name.trim();
            await this.externalHooks.run('tag.beforeUpdate', [newTag]);
            await TagHelpers.validateTag(newTag);
            const tag = await _1.Db.collections.Tag.save(newTag).catch(TagHelpers.throwDuplicateEntryError);
            await this.externalHooks.run('tag.afterUpdate', [tag]);
            tag.id = tag.id.toString();
            return tag;
        }));
        this.app.delete(`/${this.restEndpoint}/tags/:id`, _1.ResponseHelper.send(async (req, res) => {
            const id = Number(req.params.id);
            await this.externalHooks.run('tag.beforeDelete', [id]);
            await _1.Db.collections.Tag.delete({ id });
            await this.externalHooks.run('tag.afterDelete', [id]);
            return true;
        }));
        this.app.get(`/${this.restEndpoint}/node-parameter-options`, _1.ResponseHelper.send(async (req, res) => {
            const nodeType = req.query.nodeType;
            const path = req.query.path;
            let credentials = undefined;
            const currentNodeParameters = JSON.parse('' + req.query.currentNodeParameters);
            if (req.query.credentials !== undefined) {
                credentials = JSON.parse(req.query.credentials);
            }
            const methodName = req.query.methodName;
            const nodeTypes = _1.NodeTypes();
            const loadDataInstance = new n8n_core_1.LoadNodeParameterOptions(nodeType, nodeTypes, path, JSON.parse('' + req.query.currentNodeParameters), credentials);
            const workflowData = loadDataInstance.getWorkflowData();
            const workflowCredentials = await _1.WorkflowCredentials(workflowData.nodes);
            const additionalData = await _1.WorkflowExecuteAdditionalData.getBase(workflowCredentials, currentNodeParameters);
            return loadDataInstance.getOptions(methodName, additionalData);
        }));
        this.app.get(`/${this.restEndpoint}/node-types`, _1.ResponseHelper.send(async (req, res) => {
            const returnData = [];
            const nodeTypes = _1.NodeTypes();
            const allNodes = nodeTypes.getAll();
            allNodes.forEach((nodeData) => {
                const nodeInfo = Object.assign({}, nodeData.description);
                if (req.query.includeProperties !== 'true') {
                    delete nodeInfo.properties;
                }
                returnData.push(nodeInfo);
            });
            return returnData;
        }));
        this.app.post(`/${this.restEndpoint}/node-types`, _1.ResponseHelper.send(async (req, res) => {
            const nodeNames = _.get(req, 'body.nodeNames', []);
            const nodeTypes = _1.NodeTypes();
            return nodeNames.map(name => {
                try {
                    return nodeTypes.getByName(name);
                }
                catch (e) {
                    return undefined;
                }
            }).filter(nodeData => !!nodeData).map(nodeData => nodeData.description);
        }));
        this.app.get([`/${this.restEndpoint}/node-icon/:nodeType`, `/${this.restEndpoint}/node-icon/:scope/:nodeType`], async (req, res) => {
            const nodeTypeName = `${req.params.scope ? `${req.params.scope}/` : ''}${req.params.nodeType}`;
            const nodeTypes = _1.NodeTypes();
            const nodeType = nodeTypes.getByName(nodeTypeName);
            if (nodeType === undefined) {
                res.status(404).send('The nodeType is not known.');
                return;
            }
            if (nodeType.description.icon === undefined) {
                res.status(404).send('No icon found for node.');
                return;
            }
            if (!nodeType.description.icon.startsWith('file:')) {
                res.status(404).send('Node does not have a file icon.');
                return;
            }
            const filepath = nodeType.description.icon.substr(5);
            const maxAge = 7 * 24 * 60 * 60 * 1000;
            res.setHeader('Cache-control', `private max-age=${maxAge}`);
            res.sendFile(filepath);
        });
        this.app.get(`/${this.restEndpoint}/active`, _1.ResponseHelper.send(async (req, res) => {
            const activeWorkflows = await this.activeWorkflowRunner.getActiveWorkflows();
            return activeWorkflows.map(workflow => workflow.id.toString());
        }));
        this.app.get(`/${this.restEndpoint}/active/error/:id`, _1.ResponseHelper.send(async (req, res) => {
            const id = req.params.id;
            return this.activeWorkflowRunner.getActivationError(id);
        }));
        this.app.delete(`/${this.restEndpoint}/credentials/:id`, _1.ResponseHelper.send(async (req, res) => {
            const id = req.params.id;
            await this.externalHooks.run('credentials.delete', [id]);
            await _1.Db.collections.Credentials.delete({ id });
            return true;
        }));
        this.app.post(`/${this.restEndpoint}/credentials`, _1.ResponseHelper.send(async (req, res) => {
            const incomingData = req.body;
            if (!incomingData.name || incomingData.name.length < 3) {
                throw new _1.ResponseHelper.ResponseError(`Credentials name must be at least 3 characters long.`, undefined, 400);
            }
            for (const nodeAccess of incomingData.nodesAccess) {
                nodeAccess.date = this.getCurrentDate();
            }
            const encryptionKey = await n8n_core_1.UserSettings.getEncryptionKey();
            if (encryptionKey === undefined) {
                throw new Error('No encryption key got found to encrypt the credentials!');
            }
            if (incomingData.name === '') {
                throw new Error('Credentials have to have a name set!');
            }
            const findQuery = {
                where: {
                    name: incomingData.name,
                    type: incomingData.type,
                },
            };
            const checkResult = await _1.Db.collections.Credentials.findOne(findQuery);
            if (checkResult !== undefined) {
                throw new _1.ResponseHelper.ResponseError(`Credentials with the same type and name exist already.`, undefined, 400);
            }
            const credentials = new n8n_core_1.Credentials(incomingData.name, incomingData.type, incomingData.nodesAccess);
            credentials.setData(incomingData.data, encryptionKey);
            const newCredentialsData = credentials.getDataToSave();
            await this.externalHooks.run('credentials.create', [newCredentialsData]);
            const result = await _1.Db.collections.Credentials.save(newCredentialsData);
            result.data = incomingData.data;
            result.id = result.id.toString();
            return result;
        }));
        this.app.patch(`/${this.restEndpoint}/credentials/:id`, _1.ResponseHelper.send(async (req, res) => {
            const incomingData = req.body;
            const id = req.params.id;
            if (incomingData.name === '') {
                throw new Error('Credentials have to have a name set!');
            }
            for (const nodeAccess of incomingData.nodesAccess) {
                if (!nodeAccess.date) {
                    nodeAccess.date = this.getCurrentDate();
                }
            }
            const findQuery = {
                where: {
                    id: typeorm_2.Not(id),
                    name: incomingData.name,
                    type: incomingData.type,
                },
            };
            const checkResult = await _1.Db.collections.Credentials.findOne(findQuery);
            if (checkResult !== undefined) {
                throw new _1.ResponseHelper.ResponseError(`Credentials with the same type and name exist already.`, undefined, 400);
            }
            const encryptionKey = await n8n_core_1.UserSettings.getEncryptionKey();
            if (encryptionKey === undefined) {
                throw new Error('No encryption key got found to encrypt the credentials!');
            }
            const result = await _1.Db.collections.Credentials.findOne(id);
            if (result === undefined) {
                throw new _1.ResponseHelper.ResponseError(`Credentials with the id "${id}" do not exist.`, undefined, 400);
            }
            const currentlySavedCredentials = new n8n_core_1.Credentials(result.name, result.type, result.nodesAccess, result.data);
            const decryptedData = currentlySavedCredentials.getData(encryptionKey);
            if (decryptedData.oauthTokenData) {
                incomingData.data.oauthTokenData = decryptedData.oauthTokenData;
            }
            const credentials = new n8n_core_1.Credentials(incomingData.name, incomingData.type, incomingData.nodesAccess);
            credentials.setData(incomingData.data, encryptionKey);
            const newCredentialsData = credentials.getDataToSave();
            newCredentialsData.updatedAt = this.getCurrentDate();
            await this.externalHooks.run('credentials.update', [newCredentialsData]);
            await _1.Db.collections.Credentials.update(id, newCredentialsData);
            const responseData = await _1.Db.collections.Credentials.findOne(id);
            if (responseData === undefined) {
                throw new _1.ResponseHelper.ResponseError(`Credentials with id "${id}" could not be found to be updated.`, undefined, 400);
            }
            responseData.data = '';
            responseData.id = responseData.id.toString();
            return responseData;
        }));
        this.app.get(`/${this.restEndpoint}/credentials/:id`, _1.ResponseHelper.send(async (req, res) => {
            const findQuery = {};
            const includeData = ['true', true].includes(req.query.includeData);
            if (includeData !== true) {
                findQuery.select = ['id', 'name', 'type', 'nodesAccess', 'createdAt', 'updatedAt'];
            }
            const result = await _1.Db.collections.Credentials.findOne(req.params.id);
            if (result === undefined) {
                return result;
            }
            let encryptionKey = undefined;
            if (includeData === true) {
                encryptionKey = await n8n_core_1.UserSettings.getEncryptionKey();
                if (encryptionKey === undefined) {
                    throw new Error('No encryption key got found to decrypt the credentials!');
                }
                const credentials = new n8n_core_1.Credentials(result.name, result.type, result.nodesAccess, result.data);
                result.data = credentials.getData(encryptionKey);
            }
            result.id = result.id.toString();
            return result;
        }));
        this.app.get(`/${this.restEndpoint}/credentials`, _1.ResponseHelper.send(async (req, res) => {
            const findQuery = {};
            if (req.query.filter) {
                findQuery.where = JSON.parse(req.query.filter);
                if (findQuery.where.id !== undefined) {
                    findQuery.where = { id: findQuery.where.id };
                }
            }
            findQuery.select = ['id', 'name', 'type', 'nodesAccess', 'createdAt', 'updatedAt'];
            const results = await _1.Db.collections.Credentials.find(findQuery);
            let encryptionKey = undefined;
            const includeData = ['true', true].includes(req.query.includeData);
            if (includeData === true) {
                encryptionKey = await n8n_core_1.UserSettings.getEncryptionKey();
                if (encryptionKey === undefined) {
                    throw new Error('No encryption key got found to decrypt the credentials!');
                }
            }
            let result;
            for (result of results) {
                result.id = result.id.toString();
            }
            return results;
        }));
        this.app.get(`/${this.restEndpoint}/credential-types`, _1.ResponseHelper.send(async (req, res) => {
            const returnData = [];
            const credentialTypes = _1.CredentialTypes();
            credentialTypes.getAll().forEach((credentialData) => {
                returnData.push(credentialData);
            });
            return returnData;
        }));
        this.app.get(`/${this.restEndpoint}/oauth1-credential/auth`, _1.ResponseHelper.send(async (req, res) => {
            if (req.query.id === undefined) {
                res.status(500).send('Required credential id is missing!');
                return '';
            }
            const result = await _1.Db.collections.Credentials.findOne(req.query.id);
            if (result === undefined) {
                res.status(404).send('The credential is not known.');
                return '';
            }
            let encryptionKey = undefined;
            encryptionKey = await n8n_core_1.UserSettings.getEncryptionKey();
            if (encryptionKey === undefined) {
                res.status(500).send('No encryption key got found to decrypt the credentials!');
                return '';
            }
            const workflowCredentials = {
                [result.type]: {
                    [result.name]: result,
                },
            };
            const mode = 'internal';
            const credentialsHelper = new _1.CredentialsHelper(workflowCredentials, encryptionKey);
            const decryptedDataOriginal = credentialsHelper.getDecrypted(result.name, result.type, mode, true);
            const oauthCredentials = credentialsHelper.applyDefaultsAndOverwrites(decryptedDataOriginal, result.type, mode);
            const signatureMethod = _.get(oauthCredentials, 'signatureMethod');
            const oAuthOptions = {
                consumer: {
                    key: _.get(oauthCredentials, 'consumerKey'),
                    secret: _.get(oauthCredentials, 'consumerSecret'),
                },
                signature_method: signatureMethod,
                hash_function(base, key) {
                    const algorithm = (signatureMethod === 'HMAC-SHA1') ? 'sha1' : 'sha256';
                    return crypto_1.createHmac(algorithm, key)
                        .update(base)
                        .digest('base64');
                },
            };
            const oauthRequestData = {
                oauth_callback: `${_1.WebhookHelpers.getWebhookBaseUrl()}${this.restEndpoint}/oauth1-credential/callback?cid=${req.query.id}`,
            };
            await this.externalHooks.run('oauth1.authenticate', [oAuthOptions, oauthRequestData]);
            const oauth = new clientOAuth1(oAuthOptions);
            const options = {
                method: 'POST',
                url: _.get(oauthCredentials, 'requestTokenUrl'),
                data: oauthRequestData,
            };
            const data = oauth.toHeader(oauth.authorize(options));
            options.headers = data;
            const response = await requestPromise(options);
            const responseJson = querystring.parse(response);
            const returnUri = `${_.get(oauthCredentials, 'authUrl')}?oauth_token=${responseJson.oauth_token}`;
            const credentials = new n8n_core_1.Credentials(result.name, result.type, result.nodesAccess);
            credentials.setData(decryptedDataOriginal, encryptionKey);
            const newCredentialsData = credentials.getDataToSave();
            newCredentialsData.updatedAt = this.getCurrentDate();
            await _1.Db.collections.Credentials.update(req.query.id, newCredentialsData);
            return returnUri;
        }));
        this.app.get(`/${this.restEndpoint}/oauth1-credential/callback`, async (req, res) => {
            const { oauth_verifier, oauth_token, cid } = req.query;
            if (oauth_verifier === undefined || oauth_token === undefined) {
                const errorResponse = new _1.ResponseHelper.ResponseError('Insufficient parameters for OAuth1 callback. Received following query parameters: ' + JSON.stringify(req.query), undefined, 503);
                return _1.ResponseHelper.sendErrorResponse(res, errorResponse);
            }
            const result = await _1.Db.collections.Credentials.findOne(cid);
            if (result === undefined) {
                const errorResponse = new _1.ResponseHelper.ResponseError('The credential is not known.', undefined, 404);
                return _1.ResponseHelper.sendErrorResponse(res, errorResponse);
            }
            let encryptionKey = undefined;
            encryptionKey = await n8n_core_1.UserSettings.getEncryptionKey();
            if (encryptionKey === undefined) {
                const errorResponse = new _1.ResponseHelper.ResponseError('No encryption key got found to decrypt the credentials!', undefined, 503);
                return _1.ResponseHelper.sendErrorResponse(res, errorResponse);
            }
            const workflowCredentials = {
                [result.type]: {
                    [result.name]: result,
                },
            };
            const mode = 'internal';
            const credentialsHelper = new _1.CredentialsHelper(workflowCredentials, encryptionKey);
            const decryptedDataOriginal = credentialsHelper.getDecrypted(result.name, result.type, mode, true);
            const oauthCredentials = credentialsHelper.applyDefaultsAndOverwrites(decryptedDataOriginal, result.type, mode);
            const options = {
                method: 'POST',
                url: _.get(oauthCredentials, 'accessTokenUrl'),
                qs: {
                    oauth_token,
                    oauth_verifier,
                },
            };
            let oauthToken;
            try {
                oauthToken = await requestPromise(options);
            }
            catch (error) {
                const errorResponse = new _1.ResponseHelper.ResponseError('Unable to get access tokens!', undefined, 404);
                return _1.ResponseHelper.sendErrorResponse(res, errorResponse);
            }
            const oauthTokenJson = querystring.parse(oauthToken);
            decryptedDataOriginal.oauthTokenData = oauthTokenJson;
            const credentials = new n8n_core_1.Credentials(result.name, result.type, result.nodesAccess);
            credentials.setData(decryptedDataOriginal, encryptionKey);
            const newCredentialsData = credentials.getDataToSave();
            newCredentialsData.updatedAt = this.getCurrentDate();
            await _1.Db.collections.Credentials.update(cid, newCredentialsData);
            res.sendFile(path_1.resolve(__dirname, '../../templates/oauth-callback.html'));
        });
        this.app.get(`/${this.restEndpoint}/oauth2-credential/auth`, _1.ResponseHelper.send(async (req, res) => {
            if (req.query.id === undefined) {
                res.status(500).send('Required credential id is missing.');
                return '';
            }
            const result = await _1.Db.collections.Credentials.findOne(req.query.id);
            if (result === undefined) {
                res.status(404).send('The credential is not known.');
                return '';
            }
            let encryptionKey = undefined;
            encryptionKey = await n8n_core_1.UserSettings.getEncryptionKey();
            if (encryptionKey === undefined) {
                res.status(500).send('No encryption key got found to decrypt the credentials!');
                return '';
            }
            const workflowCredentials = {
                [result.type]: {
                    [result.name]: result,
                },
            };
            const mode = 'internal';
            const credentialsHelper = new _1.CredentialsHelper(workflowCredentials, encryptionKey);
            const decryptedDataOriginal = credentialsHelper.getDecrypted(result.name, result.type, mode, true);
            const oauthCredentials = credentialsHelper.applyDefaultsAndOverwrites(decryptedDataOriginal, result.type, mode);
            const token = new csrf();
            const csrfSecret = token.secretSync();
            const state = {
                token: token.create(csrfSecret),
                cid: req.query.id,
            };
            const stateEncodedStr = Buffer.from(JSON.stringify(state)).toString('base64');
            const oAuthOptions = {
                clientId: _.get(oauthCredentials, 'clientId'),
                clientSecret: _.get(oauthCredentials, 'clientSecret', ''),
                accessTokenUri: _.get(oauthCredentials, 'accessTokenUrl', ''),
                authorizationUri: _.get(oauthCredentials, 'authUrl', ''),
                redirectUri: `${_1.WebhookHelpers.getWebhookBaseUrl()}${this.restEndpoint}/oauth2-credential/callback`,
                scopes: _.split(_.get(oauthCredentials, 'scope', 'openid,'), ','),
                state: stateEncodedStr,
            };
            await this.externalHooks.run('oauth2.authenticate', [oAuthOptions]);
            const oAuthObj = new clientOAuth2(oAuthOptions);
            const credentials = new n8n_core_1.Credentials(result.name, result.type, result.nodesAccess);
            decryptedDataOriginal.csrfSecret = csrfSecret;
            credentials.setData(decryptedDataOriginal, encryptionKey);
            const newCredentialsData = credentials.getDataToSave();
            newCredentialsData.updatedAt = this.getCurrentDate();
            await _1.Db.collections.Credentials.update(req.query.id, newCredentialsData);
            const authQueryParameters = _.get(oauthCredentials, 'authQueryParameters', '');
            let returnUri = oAuthObj.code.getUri();
            if (_.get(oauthCredentials, 'scope').includes(',')) {
                const data = querystring.parse(returnUri.split('?')[1]);
                data.scope = _.get(oauthCredentials, 'scope');
                returnUri = `${_.get(oauthCredentials, 'authUrl', '')}?${querystring.stringify(data)}`;
            }
            if (authQueryParameters) {
                returnUri += '&' + authQueryParameters;
            }
            return returnUri;
        }));
        this.app.get(`/${this.restEndpoint}/oauth2-credential/callback`, async (req, res) => {
            const { code, state: stateEncoded } = req.query;
            if (code === undefined || stateEncoded === undefined) {
                const errorResponse = new _1.ResponseHelper.ResponseError('Insufficient parameters for OAuth2 callback. Received following query parameters: ' + JSON.stringify(req.query), undefined, 503);
                return _1.ResponseHelper.sendErrorResponse(res, errorResponse);
            }
            let state;
            try {
                state = JSON.parse(Buffer.from(stateEncoded, 'base64').toString());
            }
            catch (error) {
                const errorResponse = new _1.ResponseHelper.ResponseError('Invalid state format returned', undefined, 503);
                return _1.ResponseHelper.sendErrorResponse(res, errorResponse);
            }
            const result = await _1.Db.collections.Credentials.findOne(state.cid);
            if (result === undefined) {
                const errorResponse = new _1.ResponseHelper.ResponseError('The credential is not known.', undefined, 404);
                return _1.ResponseHelper.sendErrorResponse(res, errorResponse);
            }
            let encryptionKey = undefined;
            encryptionKey = await n8n_core_1.UserSettings.getEncryptionKey();
            if (encryptionKey === undefined) {
                const errorResponse = new _1.ResponseHelper.ResponseError('No encryption key got found to decrypt the credentials!', undefined, 503);
                return _1.ResponseHelper.sendErrorResponse(res, errorResponse);
            }
            const workflowCredentials = {
                [result.type]: {
                    [result.name]: result,
                },
            };
            const mode = 'internal';
            const credentialsHelper = new _1.CredentialsHelper(workflowCredentials, encryptionKey);
            const decryptedDataOriginal = credentialsHelper.getDecrypted(result.name, result.type, mode, true);
            const oauthCredentials = credentialsHelper.applyDefaultsAndOverwrites(decryptedDataOriginal, result.type, mode);
            const token = new csrf();
            if (decryptedDataOriginal.csrfSecret === undefined || !token.verify(decryptedDataOriginal.csrfSecret, state.token)) {
                const errorResponse = new _1.ResponseHelper.ResponseError('The OAuth2 callback state is invalid!', undefined, 404);
                return _1.ResponseHelper.sendErrorResponse(res, errorResponse);
            }
            let options = {};
            const oAuth2Parameters = {
                clientId: _.get(oauthCredentials, 'clientId'),
                clientSecret: _.get(oauthCredentials, 'clientSecret', ''),
                accessTokenUri: _.get(oauthCredentials, 'accessTokenUrl', ''),
                authorizationUri: _.get(oauthCredentials, 'authUrl', ''),
                redirectUri: `${_1.WebhookHelpers.getWebhookBaseUrl()}${this.restEndpoint}/oauth2-credential/callback`,
                scopes: _.split(_.get(oauthCredentials, 'scope', 'openid,'), ','),
            };
            if (_.get(oauthCredentials, 'authentication', 'header') === 'body') {
                options = {
                    body: {
                        client_id: _.get(oauthCredentials, 'clientId'),
                        client_secret: _.get(oauthCredentials, 'clientSecret', ''),
                    },
                };
                delete oAuth2Parameters.clientSecret;
            }
            await this.externalHooks.run('oauth2.callback', [oAuth2Parameters]);
            const oAuthObj = new clientOAuth2(oAuth2Parameters);
            const queryParameters = req.originalUrl.split('?').splice(1, 1).join('');
            const oauthToken = await oAuthObj.code.getToken(`${oAuth2Parameters.redirectUri}?${queryParameters}`, options);
            if (Object.keys(req.query).length > 2) {
                _.set(oauthToken.data, 'callbackQueryString', _.omit(req.query, 'state', 'code'));
            }
            if (oauthToken === undefined) {
                const errorResponse = new _1.ResponseHelper.ResponseError('Unable to get access tokens!', undefined, 404);
                return _1.ResponseHelper.sendErrorResponse(res, errorResponse);
            }
            if (decryptedDataOriginal.oauthTokenData) {
                Object.assign(decryptedDataOriginal.oauthTokenData, oauthToken.data);
            }
            else {
                decryptedDataOriginal.oauthTokenData = oauthToken.data;
            }
            _.unset(decryptedDataOriginal, 'csrfSecret');
            const credentials = new n8n_core_1.Credentials(result.name, result.type, result.nodesAccess);
            credentials.setData(decryptedDataOriginal, encryptionKey);
            const newCredentialsData = credentials.getDataToSave();
            newCredentialsData.updatedAt = this.getCurrentDate();
            await _1.Db.collections.Credentials.update(state.cid, newCredentialsData);
            res.sendFile(path_1.resolve(__dirname, '../../templates/oauth-callback.html'));
        });
        this.app.get(`/${this.restEndpoint}/executions`, _1.ResponseHelper.send(async (req, res) => {
            let filter = {};
            if (req.query.filter) {
                filter = JSON.parse(req.query.filter);
            }
            let limit = 20;
            if (req.query.limit) {
                limit = parseInt(req.query.limit, 10);
            }
            const executingWorkflowIds = [];
            if (config.get('executions.mode') === 'queue') {
                const currentJobs = await Queue.getInstance().getJobs(['active', 'waiting']);
                executingWorkflowIds.push(...currentJobs.map(job => job.data.executionId));
            }
            executingWorkflowIds.push(...this.activeExecutionsInstance.getActiveExecutions().map(execution => execution.id.toString()));
            const countFilter = JSON.parse(JSON.stringify(filter));
            countFilter.select = ['id'];
            countFilter.where = { id: typeorm_2.Not(typeorm_1.In(executingWorkflowIds)) };
            const resultsQuery = await _1.Db.collections.Execution
                .createQueryBuilder("execution")
                .select([
                'execution.id',
                'execution.finished',
                'execution.mode',
                'execution.retryOf',
                'execution.retrySuccessId',
                'execution.startedAt',
                'execution.stoppedAt',
                'execution.workflowData',
            ])
                .orderBy('execution.id', 'DESC')
                .take(limit);
            Object.keys(filter).forEach((filterField) => {
                resultsQuery.andWhere(`execution.${filterField} = :${filterField}`, { [filterField]: filter[filterField] });
            });
            if (req.query.lastId) {
                resultsQuery.andWhere(`execution.id < :lastId`, { lastId: req.query.lastId });
            }
            if (req.query.firstId) {
                resultsQuery.andWhere(`execution.id > :firstId`, { firstId: req.query.firstId });
            }
            if (executingWorkflowIds.length > 0) {
                resultsQuery.andWhere(`execution.id NOT IN (:...ids)`, { ids: executingWorkflowIds });
            }
            const resultsPromise = resultsQuery.getMany();
            const countPromise = _1.Db.collections.Execution.count(countFilter);
            const results = await resultsPromise;
            const count = await countPromise;
            const returnResults = [];
            for (const result of results) {
                returnResults.push({
                    id: result.id.toString(),
                    finished: result.finished,
                    mode: result.mode,
                    retryOf: result.retryOf ? result.retryOf.toString() : undefined,
                    retrySuccessId: result.retrySuccessId ? result.retrySuccessId.toString() : undefined,
                    startedAt: result.startedAt,
                    stoppedAt: result.stoppedAt,
                    workflowId: result.workflowData.id ? result.workflowData.id.toString() : '',
                    workflowName: result.workflowData.name,
                });
            }
            return {
                count,
                results: returnResults,
            };
        }));
        this.app.get(`/${this.restEndpoint}/executions/:id`, _1.ResponseHelper.send(async (req, res) => {
            const result = await _1.Db.collections.Execution.findOne(req.params.id);
            if (result === undefined) {
                return undefined;
            }
            if (req.query.unflattedResponse === 'true') {
                const fullExecutionData = _1.ResponseHelper.unflattenExecutionData(result);
                return fullExecutionData;
            }
            else {
                result.id = result.id.toString();
                return result;
            }
        }));
        this.app.post(`/${this.restEndpoint}/executions/:id/retry`, _1.ResponseHelper.send(async (req, res) => {
            const fullExecutionDataFlatted = await _1.Db.collections.Execution.findOne(req.params.id);
            if (fullExecutionDataFlatted === undefined) {
                throw new _1.ResponseHelper.ResponseError(`The execution with the id "${req.params.id}" does not exist.`, 404, 404);
            }
            const fullExecutionData = _1.ResponseHelper.unflattenExecutionData(fullExecutionDataFlatted);
            if (fullExecutionData.finished === true) {
                throw new Error('The execution did succeed and can so not be retried.');
            }
            const executionMode = 'retry';
            const credentials = await _1.WorkflowCredentials(fullExecutionData.workflowData.nodes);
            fullExecutionData.workflowData.active = false;
            const data = {
                credentials,
                executionMode,
                executionData: fullExecutionData.data,
                retryOf: req.params.id,
                workflowData: fullExecutionData.workflowData,
            };
            const lastNodeExecuted = data.executionData.resultData.lastNodeExecuted;
            if (lastNodeExecuted) {
                delete data.executionData.resultData.error;
                const length = data.executionData.resultData.runData[lastNodeExecuted].length;
                if (length > 0 && data.executionData.resultData.runData[lastNodeExecuted][length - 1].error !== undefined) {
                    data.executionData.resultData.runData[lastNodeExecuted].pop();
                }
            }
            if (req.body.loadWorkflow === true) {
                const workflowId = fullExecutionData.workflowData.id;
                const workflowData = await _1.Db.collections.Workflow.findOne(workflowId);
                if (workflowData === undefined) {
                    throw new Error(`The workflow with the ID "${workflowId}" could not be found and so the data not be loaded for the retry.`);
                }
                data.workflowData = workflowData;
                const nodeTypes = _1.NodeTypes();
                const workflowInstance = new n8n_workflow_1.Workflow({ id: workflowData.id, name: workflowData.name, nodes: workflowData.nodes, connections: workflowData.connections, active: false, nodeTypes, staticData: undefined, settings: workflowData.settings });
                for (const stack of data.executionData.executionData.nodeExecutionStack) {
                    const node = workflowInstance.getNode(stack.node.name);
                    if (node === null) {
                        throw new Error(`Could not find the node "${stack.node.name}" in workflow. It probably got deleted or renamed. Without it the workflow can sadly not be retried.`);
                    }
                    stack.node = node;
                }
            }
            const workflowRunner = new _1.WorkflowRunner();
            const executionId = await workflowRunner.run(data);
            const executionData = await this.activeExecutionsInstance.getPostExecutePromise(executionId);
            if (executionData === undefined) {
                throw new Error('The retry did not start for an unknown reason.');
            }
            return !!executionData.finished;
        }));
        this.app.post(`/${this.restEndpoint}/executions/delete`, _1.ResponseHelper.send(async (req, res) => {
            const deleteData = req.body;
            if (deleteData.deleteBefore !== undefined) {
                const filters = {
                    startedAt: typeorm_2.LessThanOrEqual(deleteData.deleteBefore),
                };
                if (deleteData.filters !== undefined) {
                    Object.assign(filters, deleteData.filters);
                }
                await _1.Db.collections.Execution.delete(filters);
            }
            else if (deleteData.ids !== undefined) {
                await _1.Db.collections.Execution.delete(deleteData.ids);
            }
            else {
                throw new Error('Required body-data "ids" or "deleteBefore" is missing!');
            }
        }));
        this.app.get(`/${this.restEndpoint}/executions-current`, _1.ResponseHelper.send(async (req, res) => {
            if (config.get('executions.mode') === 'queue') {
                const currentJobs = await Queue.getInstance().getJobs(['active', 'waiting']);
                const currentlyRunningQueueIds = currentJobs.map(job => job.data.executionId);
                const currentlyRunningManualExecutions = this.activeExecutionsInstance.getActiveExecutions();
                const manualExecutionIds = currentlyRunningManualExecutions.map(execution => execution.id);
                const currentlyRunningExecutionIds = currentlyRunningQueueIds.concat(manualExecutionIds);
                if (currentlyRunningExecutionIds.length === 0) {
                    return [];
                }
                const resultsQuery = await _1.Db.collections.Execution
                    .createQueryBuilder("execution")
                    .select([
                    'execution.id',
                    'execution.workflowId',
                    'execution.mode',
                    'execution.retryOf',
                    'execution.startedAt',
                ])
                    .orderBy('execution.id', 'DESC')
                    .andWhere(`execution.id IN (:...ids)`, { ids: currentlyRunningExecutionIds });
                if (req.query.filter) {
                    const filter = JSON.parse(req.query.filter);
                    if (filter.workflowId !== undefined) {
                        resultsQuery.andWhere('execution.workflowId = :workflowId', { workflowId: filter.workflowId });
                    }
                }
                const results = await resultsQuery.getMany();
                return results.map(result => {
                    return {
                        id: result.id,
                        workflowId: result.workflowId,
                        mode: result.mode,
                        retryOf: result.retryOf !== null ? result.retryOf : undefined,
                        startedAt: new Date(result.startedAt),
                    };
                });
            }
            else {
                const executingWorkflows = this.activeExecutionsInstance.getActiveExecutions();
                const returnData = [];
                let filter = {};
                if (req.query.filter) {
                    filter = JSON.parse(req.query.filter);
                }
                for (const data of executingWorkflows) {
                    if (filter.workflowId !== undefined && filter.workflowId !== data.workflowId) {
                        continue;
                    }
                    returnData.push({
                        id: data.id.toString(),
                        workflowId: data.workflowId === undefined ? '' : data.workflowId.toString(),
                        mode: data.mode,
                        retryOf: data.retryOf,
                        startedAt: new Date(data.startedAt),
                    });
                }
                returnData.sort((a, b) => parseInt(b.id, 10) - parseInt(a.id, 10));
                return returnData;
            }
        }));
        this.app.post(`/${this.restEndpoint}/executions-current/:id/stop`, _1.ResponseHelper.send(async (req, res) => {
            var _a;
            if (config.get('executions.mode') === 'queue') {
                const result = await this.activeExecutionsInstance.stopExecution(req.params.id);
                if (result !== undefined) {
                    const returnData = {
                        mode: result.mode,
                        startedAt: new Date(result.startedAt),
                        stoppedAt: result.stoppedAt ? new Date(result.stoppedAt) : undefined,
                        finished: result.finished,
                    };
                    return returnData;
                }
                const currentJobs = await Queue.getInstance().getJobs(['active', 'waiting']);
                const job = currentJobs.find(job => job.data.executionId.toString() === req.params.id);
                if (!job) {
                    throw new Error(`Could not stop "${req.params.id}" as it is no longer in queue.`);
                }
                else {
                    await Queue.getInstance().stopJob(job);
                }
                const executionDb = await ((_a = _1.Db.collections.Execution) === null || _a === void 0 ? void 0 : _a.findOne(req.params.id));
                const fullExecutionData = _1.ResponseHelper.unflattenExecutionData(executionDb);
                const returnData = {
                    mode: fullExecutionData.mode,
                    startedAt: new Date(fullExecutionData.startedAt),
                    stoppedAt: fullExecutionData.stoppedAt ? new Date(fullExecutionData.stoppedAt) : undefined,
                    finished: fullExecutionData.finished,
                };
                return returnData;
            }
            else {
                const executionId = req.params.id;
                const result = await this.activeExecutionsInstance.stopExecution(executionId);
                if (result === undefined) {
                    throw new Error(`The execution id "${executionId}" could not be found.`);
                }
                const returnData = {
                    mode: result.mode,
                    startedAt: new Date(result.startedAt),
                    stoppedAt: result.stoppedAt ? new Date(result.stoppedAt) : undefined,
                    finished: result.finished,
                };
                return returnData;
            }
        }));
        this.app.delete(`/${this.restEndpoint}/test-webhook/:id`, _1.ResponseHelper.send(async (req, res) => {
            const workflowId = req.params.id;
            return this.testWebhooks.cancelTestWebhook(workflowId);
        }));
        this.app.get(`/${this.restEndpoint}/options/timezones`, _1.ResponseHelper.send(async (req, res) => {
            return timezones;
        }));
        this.app.get(`/${this.restEndpoint}/settings`, _1.ResponseHelper.send(async (req, res) => {
            return this.frontendSettings;
        }));
        if (config.get('endpoints.disableProductionWebhooksOnMainProcess') !== true) {
            _1.WebhookServer.registerProductionWebhooks.apply(this);
        }
        this.app.head(`/${this.endpointWebhookTest}/*`, async (req, res) => {
            const requestUrl = req.parsedUrl.pathname.slice(this.endpointWebhookTest.length + 2);
            let response;
            try {
                response = await this.testWebhooks.callTestWebhook('HEAD', requestUrl, req, res);
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
        this.app.options(`/${this.endpointWebhookTest}/*`, async (req, res) => {
            const requestUrl = req.parsedUrl.pathname.slice(this.endpointWebhookTest.length + 2);
            let allowedMethods;
            try {
                allowedMethods = await this.testWebhooks.getWebhookMethods(requestUrl);
                allowedMethods.push('OPTIONS');
                res.append('Allow', allowedMethods);
            }
            catch (error) {
                _1.ResponseHelper.sendErrorResponse(res, error);
                return;
            }
            _1.ResponseHelper.sendSuccessResponse(res, {}, true, 204);
        });
        this.app.get(`/${this.endpointWebhookTest}/*`, async (req, res) => {
            const requestUrl = req.parsedUrl.pathname.slice(this.endpointWebhookTest.length + 2);
            let response;
            try {
                response = await this.testWebhooks.callTestWebhook('GET', requestUrl, req, res);
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
        this.app.post(`/${this.endpointWebhookTest}/*`, async (req, res) => {
            const requestUrl = req.parsedUrl.pathname.slice(this.endpointWebhookTest.length + 2);
            let response;
            try {
                response = await this.testWebhooks.callTestWebhook('POST', requestUrl, req, res);
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
        if (this.endpointPresetCredentials !== '') {
            this.app.post(`/${this.endpointPresetCredentials}`, async (req, res) => {
                if (this.presetCredentialsLoaded === false) {
                    const body = req.body;
                    if (req.headers['content-type'] !== 'application/json') {
                        _1.ResponseHelper.sendErrorResponse(res, new Error('Body must be a valid JSON, make sure the content-type is application/json'));
                        return;
                    }
                    const loadNodesAndCredentials = _1.LoadNodesAndCredentials();
                    const credentialsOverwrites = _1.CredentialsOverwrites();
                    await credentialsOverwrites.init(body);
                    const credentialTypes = _1.CredentialTypes();
                    await credentialTypes.init(loadNodesAndCredentials.credentialTypes);
                    this.presetCredentialsLoaded = true;
                    _1.ResponseHelper.sendSuccessResponse(res, { success: true }, true, 200);
                }
                else {
                    _1.ResponseHelper.sendErrorResponse(res, new Error('Preset credentials can be set once'));
                }
            });
        }
        const editorUiPath = require.resolve('n8n-editor-ui');
        const filePath = path_1.join(path_1.dirname(editorUiPath), 'dist', 'index.html');
        const n8nPath = config.get('path');
        let readIndexFile = fs_1.readFileSync(filePath, 'utf8');
        readIndexFile = readIndexFile.replace(/\/%BASE_PATH%\//g, n8nPath);
        readIndexFile = readIndexFile.replace(/\/favicon.ico/g, `${n8nPath}favicon.ico`);
        this.app.get(`/index.html`, async (req, res) => {
            res.send(readIndexFile);
        });
        const startTime = (new Date()).toUTCString();
        this.app.use('/', express.static(path_1.join(path_1.dirname(editorUiPath), 'dist'), {
            index: 'index.html',
            setHeaders: (res, path) => {
                if (res.req && res.req.url === '/index.html') {
                    res.setHeader('Last-Modified', startTime);
                }
            },
        }));
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
//# sourceMappingURL=Server.js.map