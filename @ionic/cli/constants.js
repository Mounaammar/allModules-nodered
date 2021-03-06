"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.COLUMNAR_OPTIONS = exports.MODERN_PROJECT_TYPES = exports.LEGACY_PROJECT_TYPES = exports.PROJECT_TYPES = exports.PROJECT_FILE = exports.ASSETS_DIRECTORY = void 0;
const chalk = require("chalk");
const lodash = require("lodash");
const path = require("path");
exports.ASSETS_DIRECTORY = path.resolve(__dirname, 'assets');
exports.PROJECT_FILE = (_a = process.env['IONIC_CONFIG_FILE']) !== null && _a !== void 0 ? _a : 'ionic.config.json';
exports.PROJECT_TYPES = ['angular', 'react', 'vue', 'ionic-angular', 'ionic1', 'custom'];
exports.LEGACY_PROJECT_TYPES = ['ionic-angular', 'ionic1'];
exports.MODERN_PROJECT_TYPES = lodash.difference(exports.PROJECT_TYPES, exports.LEGACY_PROJECT_TYPES);
exports.COLUMNAR_OPTIONS = { hsep: chalk.dim('-'), vsep: chalk.dim('|') };
