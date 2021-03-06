"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fileUtils = void 0;
class FileUtils {
    constructor() {
        this.filenameReservedRegex = (/[<>:"\/\\|?*\x00-\x1F]/g);
        this.filenameReservedRegexWindows = (/^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i);
    }
    isValidFileName(fileName) {
        if (!fileName || fileName.length > 255) {
            return false;
        }
        if (this.filenameReservedRegex.test(fileName) || this.filenameReservedRegexWindows.test(fileName)) {
            return false;
        }
        if (/^\.\.?$/.test(fileName)) {
            return false;
        }
        return true;
    }
}
exports.fileUtils = new FileUtils();
