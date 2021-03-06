"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendCommand = exports.Telemetry = void 0;
const Debug = require("debug");
const lodash = require("lodash");
const helper_1 = require("./helper");
const uuid_1 = require("./utils/uuid");
const debug = Debug('ionic:lib:telemetry');
const GA_CODE = 'UA-44023830-30';
let _gaTracker;
class Telemetry {
    constructor({ config, client, getInfo, ctx, project, session }) {
        this.client = client;
        this.config = config;
        this.getInfo = getInfo;
        this.ctx = ctx;
        this.project = project;
        this.session = session;
    }
    async sendCommand(command, args) {
        debug('Sending telemetry for command: %O %O', command, args);
        await helper_1.sendMessage({ config: this.config, ctx: this.ctx }, { type: 'telemetry', data: { command, args } });
    }
}
exports.Telemetry = Telemetry;
async function getLeek({ config, version }) {
    if (!_gaTracker) {
        const Leek = await Promise.resolve().then(() => require('leek'));
        let telemetryToken = config.get('tokens.telemetry');
        if (!telemetryToken) {
            telemetryToken = uuid_1.generateUUID();
            config.set('tokens.telemetry', telemetryToken);
            debug(`setting telemetry token to ${telemetryToken}`);
        }
        _gaTracker = new Leek({
            name: telemetryToken,
            trackingCode: GA_CODE,
            globalName: 'ionic',
            version,
            silent: !config.get('telemetry'),
        });
    }
    return _gaTracker;
}
async function sendCommand({ config, client, getInfo, ctx, session, project }, command, args) {
    const messageList = [];
    const name = 'command execution';
    const prettyArgs = args.map(a => a.includes(' ') ? `"${a}"` : a);
    const message = messageList.concat([command], prettyArgs).join(' ');
    await Promise.all([
        (async () => {
            const leek = await getLeek({ config, version: ctx.version });
            try {
                await leek.track({ name, message });
            }
            catch (e) {
                debug(`leek track error: ${e.stack ? e.stack : e}`);
            }
        })(),
        (async () => {
            const now = new Date().toISOString();
            const appflowId = project ? project.config.get('id') : undefined;
            const info = await getInfo();
            const results = info.map(r => r.key ? { [r.key]: r.value } : undefined).filter(r => !!r);
            const { req } = await client.make('POST', '/events/metrics');
            const metric = {
                'name': 'cli_command_metrics',
                'timestamp': now,
                'session_id': config.get('tokens.telemetry'),
                'source': 'cli',
                'value': {
                    'command': command,
                    'arguments': prettyArgs.join(' '),
                    'app_id': appflowId,
                    'backend': 'pro',
                    ...lodash.extend({}, ...results),
                },
            };
            const isLoggedIn = session.isLoggedIn();
            if (isLoggedIn) {
                const token = await session.getUserToken();
                req.set('Authorization', `Bearer ${token}`);
            }
            debug('metric: %o', metric);
            req.send({
                'metrics': [metric],
                'sent_at': now,
            });
            try {
                await client.do(req);
            }
            catch (e) {
                debug(`metric send error: ${e.stack ? e.stack : e}`);
            }
        })(),
    ]);
}
exports.sendCommand = sendCommand;
