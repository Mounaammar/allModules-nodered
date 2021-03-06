"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MonitoringSyncSourcemapsCommand = void 0;
const utils_fs_1 = require("@ionic/utils-fs");
const utils_terminal_1 = require("@ionic/utils-terminal");
const Debug = require("debug");
const path = require("path");
const guards_1 = require("../../guards");
const color_1 = require("../../lib/color");
const command_1 = require("../../lib/command");
const errors_1 = require("../../lib/errors");
const debug = Debug('ionic:commands:monitoring:syncmaps');
const SOURCEMAP_DIRECTORY = '.sourcemaps';
class MonitoringSyncSourcemapsCommand extends command_1.Command {
    async getMetadata() {
        return {
            name: 'syncmaps',
            type: 'project',
            summary: 'Build & upload sourcemaps to Ionic Appflow Monitoring service',
            description: `
By default, ${color_1.input('ionic monitoring syncmaps')} will upload the sourcemap files within ${color_1.strong(SOURCEMAP_DIRECTORY)}. To optionally perform a production build before uploading sourcemaps, specify the ${color_1.input('--build')} flag.
      `,
            inputs: [
                {
                    name: 'snapshot_id',
                    summary: `Specify a Snapshot ID to associate the uploaded sourcemaps with`,
                },
            ],
            options: [
                {
                    name: 'build',
                    summary: 'Invoke a production Ionic build',
                    type: Boolean,
                },
            ],
        };
    }
    async run(inputs, options) {
        const { loadCordovaConfig } = await Promise.resolve().then(() => require('../../lib/integrations/cordova/config'));
        if (!this.project) {
            throw new errors_1.FatalException(`Cannot run ${color_1.input('ionic monitoring syncmaps')} outside a project directory.`);
        }
        const token = await this.env.session.getUserToken();
        const appflowId = await this.project.requireAppflowId();
        const [snapshotId] = inputs;
        const doBuild = options.build ? true : false;
        const cordova = this.project.requireIntegration('cordova');
        const conf = await loadCordovaConfig(cordova);
        const cordovaInfo = conf.getProjectInfo();
        const appVersion = cordovaInfo.version;
        const commitHash = (await this.env.shell.output('git', ['rev-parse', 'HEAD'], { cwd: this.project.directory })).trim();
        debug(`Commit hash: ${color_1.strong(commitHash)}`);
        const sourcemapsDir = path.resolve(this.project.directory, SOURCEMAP_DIRECTORY);
        let sourcemapsExist = await utils_fs_1.pathExists(sourcemapsDir);
        if (doBuild || !sourcemapsExist) {
            const runner = await this.project.requireBuildRunner();
            const runnerOpts = runner.createOptionsFromCommandLine([], { _: [], prod: true });
            await runner.run(runnerOpts);
        }
        sourcemapsExist = await utils_fs_1.pathExists(sourcemapsDir);
        if (sourcemapsExist) {
            this.env.log.msg(`Using existing sourcemaps in ${color_1.strong(utils_terminal_1.prettyPath(sourcemapsDir))}`);
        }
        else { // TODO: this is hard-coded for ionic-angular, make it work for all project types
            throw new errors_1.FatalException(`Cannot find directory: ${color_1.strong(utils_terminal_1.prettyPath(sourcemapsDir))}.\n` +
                `Make sure you have the latest ${color_1.strong('@ionic/app-scripts')}. Then, re-run this command.`);
        }
        let count = 0;
        const tasks = this.createTaskChain();
        const syncTask = tasks.next('Syncing sourcemaps');
        const sourcemapFiles = (await utils_fs_1.readdirSafe(sourcemapsDir)).filter(f => f.endsWith('.js.map'));
        debug(`Found ${sourcemapFiles.length} sourcemap files: ${sourcemapFiles.map(f => color_1.strong(f)).join(', ')}`);
        await Promise.all(sourcemapFiles.map(async (f) => {
            await this.syncSourcemap(path.resolve(sourcemapsDir, f), snapshotId, appVersion, commitHash, appflowId, token);
            count += 1;
            syncTask.msg = `Syncing sourcemaps: ${color_1.strong(`${count} / ${sourcemapFiles.length}`)}`;
        }));
        syncTask.msg = `Syncing sourcemaps: ${color_1.strong(`${sourcemapFiles.length} / ${sourcemapFiles.length}`)}`;
        tasks.end();
        const details = utils_terminal_1.columnar([
            ['App ID', color_1.strong(appflowId)],
            ['Version', color_1.strong(appVersion)],
            ['Package ID', color_1.strong(cordovaInfo.id)],
            ['Snapshot ID', snapshotId ? color_1.strong(snapshotId) : color_1.weak('not set')],
        ], { vsep: ':' });
        this.env.log.ok(`Sourcemaps synced!\n` +
            details + '\n\n' +
            `See the Error Monitoring docs for usage information and next steps: ${color_1.strong('https://ionicframework.com/docs/appflow/monitoring')}`);
    }
    async syncSourcemap(file, snapshotId, appVersion, commitHash, appflowId, token) {
        const { req } = await this.env.client.make('POST', `/monitoring/${appflowId}/sourcemaps`);
        req
            .set('Authorization', `Bearer ${token}`)
            .send({
            name: path.basename(file),
            version: appVersion,
            commit: commitHash,
            snapshot_id: snapshotId,
        });
        try {
            const res = await this.env.client.do(req);
            return this.uploadSourcemap(res, file);
        }
        catch (e) {
            if (guards_1.isSuperAgentError(e)) {
                this.env.log.error(`Unable to sync map ${file}: ` + e.message);
                if (e.response.status === 401) {
                    this.env.log.error('Try logging out and back in again.');
                }
            }
            else {
                throw e;
            }
        }
    }
    async uploadSourcemap(sourcemap, file) {
        const { createRequest } = await Promise.resolve().then(() => require('../../lib/utils/http'));
        const sm = sourcemap;
        const fileData = await utils_fs_1.readFile(file, { encoding: 'utf8' });
        const sourcemapPost = sm.data.sourcemap_post;
        const { req } = await createRequest('POST', sourcemapPost.url, this.env.config.getHTTPConfig());
        req
            .field(sourcemapPost.fields)
            .field('file', fileData);
        const res = await req;
        if (res.status !== 204) {
            throw new errors_1.FatalException(`Unexpected status code from AWS: ${res.status}`);
        }
    }
}
exports.MonitoringSyncSourcemapsCommand = MonitoringSyncSourcemapsCommand;
