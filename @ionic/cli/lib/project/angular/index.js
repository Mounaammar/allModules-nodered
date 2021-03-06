"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AngularProject = void 0;
const Debug = require("debug");
const lodash = require("lodash");
const path = require("path");
const __1 = require("../");
const color_1 = require("../../color");
const debug = Debug('ionic:lib:project:angular');
class AngularProject extends __1.Project {
    constructor() {
        super(...arguments);
        this.type = 'angular';
    }
    async getInfo() {
        const [[ionicAngularPkg, ionicAngularPkgPath], [ionicAngularToolkitPkg, ionicAngularToolkitPkgPath], [angularCLIPkg, angularCLIPkgPath], [angularDevKitBuildAngularPkg, angularDevKitBuildAngularPkgPath], [angularDevKitSchematicsPkg, angularDevKitSchematicsPkgPath],] = await Promise.all([
            this.getPackageJson('@ionic/angular'),
            this.getPackageJson('@ionic/angular-toolkit'),
            this.getPackageJson('@angular/cli'),
            this.getPackageJson('@angular-devkit/build-angular'),
            this.getPackageJson('@angular-devkit/schematics'),
        ]);
        return [
            ...(await super.getInfo()),
            {
                group: 'ionic',
                name: 'Ionic Framework',
                key: 'framework',
                value: ionicAngularPkg ? `@ionic/angular ${ionicAngularPkg.version}` : 'not installed',
                path: ionicAngularPkgPath,
            },
            {
                group: 'ionic',
                name: '@ionic/angular-toolkit',
                key: 'ionic_angular_toolkit_version',
                value: ionicAngularToolkitPkg ? ionicAngularToolkitPkg.version : 'not installed',
                path: ionicAngularToolkitPkgPath,
            },
            {
                group: 'ionic',
                name: '@angular/cli',
                key: 'angular_cli_version',
                value: angularCLIPkg ? angularCLIPkg.version : 'not installed',
                path: angularCLIPkgPath,
            },
            {
                group: 'ionic',
                name: '@angular-devkit/build-angular',
                value: angularDevKitBuildAngularPkg ? angularDevKitBuildAngularPkg.version : 'not installed',
                path: angularDevKitBuildAngularPkgPath,
            },
            {
                group: 'ionic',
                name: '@angular-devkit/schematics',
                value: angularDevKitSchematicsPkg ? angularDevKitSchematicsPkg.version : 'not installed',
                path: angularDevKitSchematicsPkgPath,
            },
        ];
    }
    async detected() {
        try {
            const pkg = await this.requirePackageJson();
            const deps = lodash.assign({}, pkg.dependencies, pkg.devDependencies);
            if (typeof deps['@ionic/angular'] === 'string') {
                debug(`${color_1.strong('@ionic/angular')} detected in ${color_1.strong('package.json')}`);
                return true;
            }
        }
        catch (e) {
            // ignore
        }
        return false;
    }
    async requireBuildRunner() {
        const { AngularBuildRunner } = await Promise.resolve().then(() => require('./build'));
        const deps = { ...this.e, project: this };
        return new AngularBuildRunner(deps);
    }
    async requireServeRunner() {
        const { AngularServeRunner } = await Promise.resolve().then(() => require('./serve'));
        const deps = { ...this.e, project: this };
        return new AngularServeRunner(deps);
    }
    async requireGenerateRunner() {
        const { AngularGenerateRunner } = await Promise.resolve().then(() => require('./generate'));
        const deps = { ...this.e, project: this };
        return new AngularGenerateRunner(deps);
    }
    async registerAilments(registry) {
        await super.registerAilments(registry);
        // TODO: register angular project ailments
    }
    setPrimaryTheme(themeColor) {
        const themePath = path.join(this.directory, 'src', 'theme', 'variables.scss');
        return this.writeThemeColor(themePath, themeColor);
    }
}
exports.AngularProject = AngularProject;
