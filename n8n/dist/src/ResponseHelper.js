"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unflattenExecutionData = exports.flattenExecutionData = exports.send = exports.sendErrorResponse = exports.sendSuccessResponse = exports.jwtAuthAuthorizationError = exports.basicAuthAuthorizationError = exports.ResponseError = void 0;
const flatted_1 = require("flatted");
class ResponseError extends Error {
    constructor(message, errorCode, httpStatusCode) {
        super(message);
        this.name = 'ResponseError';
        if (errorCode) {
            this.errorCode = errorCode;
        }
        if (httpStatusCode) {
            this.httpStatusCode = httpStatusCode;
        }
    }
}
exports.ResponseError = ResponseError;
function basicAuthAuthorizationError(resp, realm, message) {
    resp.statusCode = 401;
    resp.setHeader('WWW-Authenticate', `Basic realm="${realm}"`);
    resp.json({ code: resp.statusCode, message });
}
exports.basicAuthAuthorizationError = basicAuthAuthorizationError;
function jwtAuthAuthorizationError(resp, message) {
    resp.statusCode = 403;
    resp.json({ code: resp.statusCode, message });
}
exports.jwtAuthAuthorizationError = jwtAuthAuthorizationError;
function sendSuccessResponse(res, data, raw, responseCode) {
    if (responseCode !== undefined) {
        res.status(responseCode);
    }
    if (raw === true) {
        if (typeof data === 'string') {
            res.send(data);
        }
        else {
            res.json(data);
        }
    }
    else {
        res.json({
            data,
        });
    }
}
exports.sendSuccessResponse = sendSuccessResponse;
function sendErrorResponse(res, error) {
    let httpStatusCode = 500;
    if (error.httpStatusCode) {
        httpStatusCode = error.httpStatusCode;
    }
    if (process.env.NODE_ENV !== 'production') {
        console.error('ERROR RESPONSE');
        console.error(error);
    }
    const response = {
        code: 0,
        message: 'Unknown error',
    };
    if (error.name === 'NodeApiError') {
        Object.assign(response, error);
    }
    if (error.errorCode) {
        response.code = error.errorCode;
    }
    if (error.message) {
        response.message = error.message;
    }
    if (error.stack && process.env.NODE_ENV !== 'production') {
        response.stack = error.stack;
    }
    res.status(httpStatusCode).json(response);
}
exports.sendErrorResponse = sendErrorResponse;
function send(processFunction) {
    return async (req, res) => {
        try {
            const data = await processFunction(req, res);
            sendSuccessResponse(res, data);
        }
        catch (error) {
            sendErrorResponse(res, error);
        }
    };
}
exports.send = send;
function flattenExecutionData(fullExecutionData) {
    const returnData = Object.assign({}, {
        data: flatted_1.stringify(fullExecutionData.data),
        mode: fullExecutionData.mode,
        startedAt: fullExecutionData.startedAt,
        stoppedAt: fullExecutionData.stoppedAt,
        finished: fullExecutionData.finished ? fullExecutionData.finished : false,
        workflowId: fullExecutionData.workflowId,
        workflowData: fullExecutionData.workflowData,
    });
    if (fullExecutionData.id !== undefined) {
        returnData.id = fullExecutionData.id.toString();
    }
    if (fullExecutionData.retryOf !== undefined) {
        returnData.retryOf = fullExecutionData.retryOf.toString();
    }
    if (fullExecutionData.retrySuccessId !== undefined) {
        returnData.retrySuccessId = fullExecutionData.retrySuccessId.toString();
    }
    return returnData;
}
exports.flattenExecutionData = flattenExecutionData;
function unflattenExecutionData(fullExecutionData) {
    const returnData = Object.assign({}, {
        id: fullExecutionData.id.toString(),
        workflowData: fullExecutionData.workflowData,
        data: flatted_1.parse(fullExecutionData.data),
        mode: fullExecutionData.mode,
        startedAt: fullExecutionData.startedAt,
        stoppedAt: fullExecutionData.stoppedAt,
        finished: fullExecutionData.finished ? fullExecutionData.finished : false,
        workflowId: fullExecutionData.workflowId,
    });
    return returnData;
}
exports.unflattenExecutionData = unflattenExecutionData;
//# sourceMappingURL=ResponseHelper.js.map