"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findOpenIonicPorts = void 0;
const utils_network_1 = require("@ionic/utils-network");
const Debug = require("debug");
const color_1 = require("../color");
const errors_1 = require("../errors");
const debug = Debug('ionic:lib:project:common');
/**
 * Convenience function for finding open ports of old-style projects.
 *
 * For `ionic-angular` and `ionic1`, Ionic provides the livereload server and
 * "dev logger" server.
 */
async function findOpenIonicPorts(address, ports) {
    try {
        const [port, livereloadPort, notificationPort] = await Promise.all([
            utils_network_1.findClosestOpenPort(ports.port),
            utils_network_1.findClosestOpenPort(ports.livereloadPort),
            utils_network_1.findClosestOpenPort(ports.notificationPort),
        ]);
        if (ports.port !== port) {
            debug(`Port ${color_1.strong(String(ports.port))} taken, using ${color_1.strong(String(port))}.`);
            ports.port = port;
        }
        if (ports.livereloadPort !== livereloadPort) {
            debug(`Port ${color_1.strong(String(ports.livereloadPort))} taken, using ${color_1.strong(String(livereloadPort))}.`);
            ports.livereloadPort = livereloadPort;
        }
        if (ports.notificationPort !== notificationPort) {
            debug(`Port ${color_1.strong(String(ports.notificationPort))} taken, using ${color_1.strong(String(notificationPort))}.`);
            ports.notificationPort = notificationPort;
        }
        return { port, livereloadPort, notificationPort };
    }
    catch (e) {
        if (e.code !== 'EADDRNOTAVAIL') {
            throw e;
        }
        throw new errors_1.FatalException(`${color_1.input(address)} is not available--cannot bind.`);
    }
}
exports.findOpenIonicPorts = findOpenIonicPorts;
