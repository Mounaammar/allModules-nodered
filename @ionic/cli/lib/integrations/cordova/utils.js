"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.confirmCordovaBrowserUsage = exports.confirmCordovaUsage = exports.checkForUnsupportedProject = exports.generateOptionsForCordovaBuild = exports.filterArgumentsForCordova = exports.SUPPORTED_PROJECT_TYPES = void 0;
const cli_framework_1 = require("@ionic/cli-framework");
const color_1 = require("../../color");
const errors_1 = require("../../errors");
const project_1 = require("../../project");
const emoji_1 = require("../../utils/emoji");
exports.SUPPORTED_PROJECT_TYPES = ['custom', 'ionic1', 'ionic-angular', 'angular'];
/**
 * Filter and gather arguments from command line to be passed to Cordova
 */
function filterArgumentsForCordova(metadata, options) {
    const m = { ...metadata };
    if (!m.options) {
        m.options = [];
    }
    const globalCordovaOpts = [
        {
            name: 'verbose',
            summary: '',
            type: Boolean,
            groups: ['cordova-cli'],
        },
        {
            name: 'nosave',
            summary: '',
            type: Boolean,
            groups: ['cordova-cli'],
        },
    ];
    m.options.push(...globalCordovaOpts);
    const results = cli_framework_1.filterCommandLineOptionsByGroup(m.options, options, 'cordova-cli');
    const args = cli_framework_1.unparseArgs(results, { useEquals: false, allowCamelCase: true });
    const i = args.indexOf('--');
    if (i >= 0) {
        args.splice(i, 1); // join separated args onto main args, use them verbatim
    }
    return [m.name, ...args];
}
exports.filterArgumentsForCordova = filterArgumentsForCordova;
function generateOptionsForCordovaBuild(metadata, inputs, options) {
    const platform = inputs[0] ? inputs[0] : (options['platform'] ? String(options['platform']) : undefined);
    const project = options['project'] ? String(options['project']) : undefined;
    // iOS does not support port forwarding out-of-the-box like Android does.
    // See https://github.com/ionic-team/native-run/issues/20
    const externalAddressRequired = platform === 'ios' || !options['native-run'];
    const includesAppScriptsGroup = cli_framework_1.OptionFilters.includesGroups('app-scripts');
    const excludesCordovaGroup = cli_framework_1.OptionFilters.excludesGroups('cordova-cli');
    const results = cli_framework_1.filterCommandLineOptions(metadata.options ? metadata.options : [], options, o => excludesCordovaGroup(o) || includesAppScriptsGroup(o));
    return {
        ...results,
        externalAddressRequired,
        open: false,
        engine: 'cordova',
        platform,
        project,
    };
}
exports.generateOptionsForCordovaBuild = generateOptionsForCordovaBuild;
async function checkForUnsupportedProject(type, cmd) {
    if (!exports.SUPPORTED_PROJECT_TYPES.includes(type)) {
        throw new errors_1.FatalException(`Ionic doesn't support using Cordova with ${color_1.input(project_1.prettyProjectName(type))} projects.\n` +
            `We encourage you to try ${emoji_1.emoji('?????? ', '')}${color_1.strong('Capacitor')}${emoji_1.emoji(' ??????', '')} (${color_1.strong('https://ion.link/capacitor')})` +
            (cmd === 'run' ? `\n\nIf you want to run your project natively, see ${color_1.input('ionic capacitor run --help')}.` : '') +
            (cmd === 'plugin' ? `\n\nIf you want to add Cordova plugins to your Capacitor project, see these docs${color_1.ancillary('[1]')}.\n\n${color_1.ancillary('[1]')}: ${color_1.strong('https://capacitor.ionicframework.com/docs/cordova/using-cordova-plugins')}` : '')
        // TODO: check for 'ionic cordova resources'
        );
    }
}
exports.checkForUnsupportedProject = checkForUnsupportedProject;
async function confirmCordovaUsage({ log, prompt }) {
    log.nl();
    log.warn(`About to integrate your app with Cordova.\n` +
        `We now recommend ${emoji_1.emoji('?????? ', '')}${color_1.strong('Capacitor')}${emoji_1.emoji('?????? ', '')} (${color_1.strong('https://ion.link/capacitor')}) as the official native runtime for Ionic. To learn about the differences between Capacitor and Cordova, see these docs${color_1.ancillary('[1]')}. For a getting started guide, see these docs${color_1.ancillary('[2]')}.\n\n` +
        `${color_1.ancillary('[1]')}: ${color_1.strong('https://ion.link/capacitor-differences-with-cordova-docs')}\n` +
        `${color_1.ancillary('[2]')}: ${color_1.strong('https://ion.link/capacitor-using-with-ionic-docs')}\n`);
    const confirm = await prompt({
        type: 'confirm',
        message: 'Are you sure you want to continue?',
        default: true,
    });
    return confirm;
}
exports.confirmCordovaUsage = confirmCordovaUsage;
async function confirmCordovaBrowserUsage({ log, prompt }) {
    log.nl();
    log.warn(`About to add the ${color_1.input('browser')} platform to your app.\n` +
        `${color_1.strong(`The ${color_1.input('browser')} Cordova platform is not recommended for production use.`)}\n\n` +
        `Instead, we recommend using platform detection and browser APIs to target web/PWA. See the Cross Platform docs${color_1.ancillary('[1]')} for details.\n\n` +
        `Alternatively, ${emoji_1.emoji('?????? ', '')}${color_1.strong('Capacitor')}${emoji_1.emoji(' ??????', '')} (${color_1.strong('https://ion.link/capacitor')}), Ionic's official native runtime, fully supports traditional web and Progressive Web Apps. See the Capacitor docs${color_1.ancillary('[2]')} to learn how easy it is to migrate.\n\n` +
        `${color_1.ancillary('[1]')}: ${color_1.strong('https://ion.link/cross-platform-docs')}\n` +
        `${color_1.ancillary('[2]')}: ${color_1.strong('https://ion.link/capacitor-cordova-migration-docs')}\n`);
    const confirm = await prompt({
        type: 'confirm',
        message: 'Are you sure you want to continue?',
        default: true,
    });
    return confirm;
}
exports.confirmCordovaBrowserUsage = confirmCordovaBrowserUsage;
