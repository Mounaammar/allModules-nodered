"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitCloneCommand = void 0;
const cli_framework_1 = require("@ionic/cli-framework");
const command_1 = require("../../lib/command");
// import { formatGitRepoUrl } from '../../lib/git';
class GitCloneCommand extends command_1.Command {
    async getMetadata() {
        return {
            name: 'clone',
            type: 'global',
            summary: 'Clones an Ionic app git repository to your computer',
            inputs: [
                {
                    name: 'id',
                    summary: 'The ID of the Ionic Appflow app to clone',
                    validators: [cli_framework_1.validators.required],
                },
                {
                    name: 'path',
                    summary: 'The destination directory of the cloned app',
                },
            ],
            groups: ["hidden" /* HIDDEN */],
        };
    }
    async run(inputs, options) {
        // let [ id, destination ] = inputs;
        // const appLoader = new App(this.env.session.getUserToken(), this.env.client);
        // const app = await appLoader.load(id);
        // const remote = await formatGitRepoUrl(this.env.config, app.id);
        // if (!destination) {
        //   destination = app.slug ? app.slug : app.id;
        // }
        // destination = path.resolve(destination);
        // await this.env.shell.run('git', ['clone', '-o', 'ionic', remote, destination], { stdio: 'inherit' });
        // this.env.log.ok(`Your app has been cloned to ${strong(prettyPath(destination))}!`);
    }
}
exports.GitCloneCommand = GitCloneCommand;
