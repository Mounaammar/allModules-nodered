"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExecuteBatch = void 0;
const fs = require("fs");
const command_1 = require("@oclif/command");
const n8n_core_1 = require("n8n-core");
const src_1 = require("../src");
const path_1 = require("path");
const json_diff_1 = require("json-diff");
const Logger_1 = require("../src/Logger");
const n8n_workflow_1 = require("n8n-workflow");
class ExecuteBatch extends command_1.Command {
    static async stopProcess(skipExit = false) {
        if (ExecuteBatch.cancelled === true) {
            process.exit(0);
        }
        ExecuteBatch.cancelled = true;
        const activeExecutionsInstance = src_1.ActiveExecutions.getInstance();
        const stopPromises = activeExecutionsInstance.getActiveExecutions().map(async (execution) => {
            activeExecutionsInstance.stopExecution(execution.id);
        });
        await Promise.allSettled(stopPromises);
        setTimeout(() => {
            process.exit(0);
        }, 30000);
        let executingWorkflows = activeExecutionsInstance.getActiveExecutions();
        let count = 0;
        while (executingWorkflows.length !== 0) {
            if (count++ % 4 === 0) {
                console.log(`Waiting for ${executingWorkflows.length} active executions to finish...`);
                executingWorkflows.map(execution => {
                    console.log(` - Execution ID ${execution.id}, workflow ID: ${execution.workflowId}`);
                });
            }
            await new Promise((resolve) => {
                setTimeout(resolve, 500);
            });
            executingWorkflows = activeExecutionsInstance.getActiveExecutions();
        }
        if (skipExit !== true) {
            process.exit(0);
        }
    }
    formatJsonOutput(data) {
        return JSON.stringify(data, null, 2);
    }
    shouldBeConsideredAsWarning(errorMessage) {
        const warningStrings = [
            'refresh token is invalid',
            'unable to connect to',
            'econnreset',
            '429',
            'econnrefused',
            'missing a required parameter',
        ];
        errorMessage = errorMessage.toLowerCase();
        for (let i = 0; i < warningStrings.length; i++) {
            if (errorMessage.includes(warningStrings[i])) {
                return true;
            }
        }
        return false;
    }
    async run() {
        process.on('SIGTERM', ExecuteBatch.stopProcess);
        process.on('SIGINT', ExecuteBatch.stopProcess);
        const logger = Logger_1.getLogger();
        n8n_workflow_1.LoggerProxy.init(logger);
        const { flags } = this.parse(ExecuteBatch);
        ExecuteBatch.debug = flags.debug === true;
        ExecuteBatch.concurrency = flags.concurrency || 1;
        const ids = [];
        const skipIds = [];
        if (flags.snapshot !== undefined) {
            if (fs.existsSync(flags.snapshot)) {
                if (!fs.lstatSync(flags.snapshot).isDirectory()) {
                    console.log(`The parameter --snapshot must be an existing directory`);
                    return;
                }
            }
            else {
                console.log(`The parameter --snapshot must be an existing directory`);
                return;
            }
            ExecuteBatch.snapshot = flags.snapshot;
        }
        if (flags.compare !== undefined) {
            if (fs.existsSync(flags.compare)) {
                if (!fs.lstatSync(flags.compare).isDirectory()) {
                    console.log(`The parameter --compare must be an existing directory`);
                    return;
                }
            }
            else {
                console.log(`The parameter --compare must be an existing directory`);
                return;
            }
            ExecuteBatch.compare = flags.compare;
        }
        if (flags.output !== undefined) {
            if (fs.existsSync(flags.output)) {
                if (fs.lstatSync(flags.output).isDirectory()) {
                    console.log(`The parameter --output must be a writable file`);
                    return;
                }
            }
        }
        if (flags.ids !== undefined) {
            const paramIds = flags.ids.split(',');
            const re = /\d+/;
            const matchedIds = paramIds.filter(id => id.match(re)).map(id => parseInt(id.trim(), 10));
            if (matchedIds.length === 0) {
                console.log(`The parameter --ids must be a list of numeric IDs separated by a comma.`);
                return;
            }
            ids.push(...matchedIds);
        }
        if (flags.skipList !== undefined) {
            if (fs.existsSync(flags.skipList)) {
                const contents = fs.readFileSync(flags.skipList, { encoding: 'utf-8' });
                skipIds.push(...contents.split(',').map(id => parseInt(id.trim(), 10)));
            }
            else {
                console.log('Skip list file not found. Exiting.');
                return;
            }
        }
        if (flags.shallow === true) {
            ExecuteBatch.shallow = true;
        }
        const startDbInitPromise = src_1.Db.init();
        const loadNodesAndCredentials = src_1.LoadNodesAndCredentials();
        const loadNodesAndCredentialsPromise = loadNodesAndCredentials.init();
        await n8n_core_1.UserSettings.prepareUserSettings();
        await startDbInitPromise;
        let allWorkflows;
        const query = src_1.Db.collections.Workflow.createQueryBuilder('workflows');
        if (ids.length > 0) {
            query.andWhere(`workflows.id in (:...ids)`, { ids });
        }
        if (skipIds.length > 0) {
            query.andWhere(`workflows.id not in (:...skipIds)`, { skipIds });
        }
        allWorkflows = await query.getMany();
        if (ExecuteBatch.debug === true) {
            process.stdout.write(`Found ${allWorkflows.length} workflows to execute.\n`);
        }
        await loadNodesAndCredentialsPromise;
        await src_1.CredentialsOverwrites().init();
        const externalHooks = src_1.ExternalHooks();
        await externalHooks.init();
        const nodeTypes = src_1.NodeTypes();
        await nodeTypes.init(loadNodesAndCredentials.nodeTypes);
        const credentialTypes = src_1.CredentialTypes();
        await credentialTypes.init(loadNodesAndCredentials.credentialTypes);
        const results = await this.runTests([...allWorkflows]);
        let { retries } = flags;
        while (retries > 0 && (results.summary.warningExecutions + results.summary.failedExecutions > 0) && ExecuteBatch.cancelled === false) {
            const failedWorkflowIds = results.summary.errors.map(execution => execution.workflowId);
            failedWorkflowIds.push(...results.summary.warnings.map(execution => execution.workflowId));
            const newWorkflowList = allWorkflows.filter(workflow => failedWorkflowIds.includes(workflow.id));
            const retryResults = await this.runTests(newWorkflowList);
            this.mergeResults(results, retryResults);
            retries--;
        }
        if (flags.output !== undefined) {
            fs.writeFileSync(flags.output, this.formatJsonOutput(results));
            console.log('\nExecution finished.');
            console.log('Summary:');
            console.log(`\tSuccess: ${results.summary.successfulExecutions}`);
            console.log(`\tFailures: ${results.summary.failedExecutions}`);
            console.log(`\tWarnings: ${results.summary.warningExecutions}`);
            console.log('\nNodes successfully tested:');
            Object.entries(results.coveredNodes).forEach(([nodeName, nodeCount]) => {
                console.log(`\t${nodeName}: ${nodeCount}`);
            });
            console.log('\nCheck the JSON file for more details.');
        }
        else {
            if (flags.shortOutput === true) {
                console.log(this.formatJsonOutput(Object.assign(Object.assign({}, results), { executions: results.executions.filter(execution => execution.executionStatus !== 'success') })));
            }
            else {
                console.log(this.formatJsonOutput(results));
            }
        }
        await ExecuteBatch.stopProcess(true);
        if (results.summary.failedExecutions > 0) {
            this.exit(1);
        }
        this.exit(0);
    }
    mergeResults(results, retryResults) {
        if (retryResults.summary.successfulExecutions === 0) {
            return;
        }
        retryResults.executions.forEach(newExecution => {
            if (newExecution.executionStatus === 'success') {
                results.executions = results.executions.filter(previousExecutions => previousExecutions.workflowId !== newExecution.workflowId);
                const errorIndex = results.summary.errors.findIndex(summaryInformation => summaryInformation.workflowId === newExecution.workflowId);
                if (errorIndex !== -1) {
                    results.summary.failedExecutions--;
                    results.summary.errors.splice(errorIndex, 1);
                }
                const warningIndex = results.summary.warnings.findIndex(summaryInformation => summaryInformation.workflowId === newExecution.workflowId);
                if (warningIndex !== -1) {
                    results.summary.warningExecutions--;
                    results.summary.warnings.splice(warningIndex, 1);
                }
                results.summary.successfulExecutions++;
                results.executions.push(newExecution);
            }
        });
    }
    async runTests(allWorkflows) {
        const result = {
            totalWorkflows: allWorkflows.length,
            summary: {
                failedExecutions: 0,
                warningExecutions: 0,
                successfulExecutions: 0,
                errors: [],
                warnings: [],
            },
            coveredNodes: {},
            executions: [],
        };
        if (ExecuteBatch.debug) {
            this.initializeLogs();
        }
        return new Promise(async (res) => {
            const promisesArray = [];
            for (let i = 0; i < ExecuteBatch.concurrency; i++) {
                const promise = new Promise(async (resolve) => {
                    let workflow;
                    while (allWorkflows.length > 0) {
                        workflow = allWorkflows.shift();
                        if (ExecuteBatch.cancelled === true) {
                            process.stdout.write(`Thread ${i + 1} resolving and quitting.`);
                            resolve(true);
                            break;
                        }
                        if (workflow === undefined) {
                            resolve(true);
                            return;
                        }
                        if (ExecuteBatch.debug) {
                            ExecuteBatch.workflowExecutionsProgress[i].push({
                                workflowId: workflow.id,
                                status: 'running',
                            });
                            this.updateStatus();
                        }
                        await this.startThread(workflow).then((executionResult) => {
                            if (ExecuteBatch.debug) {
                                ExecuteBatch.workflowExecutionsProgress[i].pop();
                            }
                            result.executions.push(executionResult);
                            if (executionResult.executionStatus === 'success') {
                                if (ExecuteBatch.debug) {
                                    ExecuteBatch.workflowExecutionsProgress[i].push({
                                        workflowId: workflow.id,
                                        status: 'success',
                                    });
                                    this.updateStatus();
                                }
                                result.summary.successfulExecutions++;
                                const nodeNames = Object.keys(executionResult.coveredNodes);
                                nodeNames.map(nodeName => {
                                    if (result.coveredNodes[nodeName] === undefined) {
                                        result.coveredNodes[nodeName] = 0;
                                    }
                                    result.coveredNodes[nodeName] += executionResult.coveredNodes[nodeName];
                                });
                            }
                            else if (executionResult.executionStatus === 'warning') {
                                result.summary.warningExecutions++;
                                result.summary.warnings.push({
                                    workflowId: executionResult.workflowId,
                                    error: executionResult.error,
                                });
                                if (ExecuteBatch.debug) {
                                    ExecuteBatch.workflowExecutionsProgress[i].push({
                                        workflowId: workflow.id,
                                        status: 'warning',
                                    });
                                    this.updateStatus();
                                }
                            }
                            else if (executionResult.executionStatus === 'error') {
                                result.summary.failedExecutions++;
                                result.summary.errors.push({
                                    workflowId: executionResult.workflowId,
                                    error: executionResult.error,
                                });
                                if (ExecuteBatch.debug) {
                                    ExecuteBatch.workflowExecutionsProgress[i].push({
                                        workflowId: workflow.id,
                                        status: 'error',
                                    });
                                    this.updateStatus();
                                }
                            }
                            else {
                                throw new Error('Wrong execution status - cannot proceed');
                            }
                        });
                    }
                    resolve(true);
                });
                promisesArray.push(promise);
            }
            await Promise.allSettled(promisesArray);
            res(result);
        });
    }
    updateStatus() {
        if (ExecuteBatch.cancelled === true) {
            return;
        }
        if (process.stdout.isTTY === true) {
            process.stdout.moveCursor(0, -(ExecuteBatch.concurrency));
            process.stdout.cursorTo(0);
            process.stdout.clearLine(0);
        }
        ExecuteBatch.workflowExecutionsProgress.map((concurrentThread, index) => {
            let message = `${index + 1}: `;
            concurrentThread.map((executionItem, workflowIndex) => {
                let openColor = '\x1b[0m';
                const closeColor = '\x1b[0m';
                switch (executionItem.status) {
                    case 'success':
                        openColor = '\x1b[32m';
                        break;
                    case 'error':
                        openColor = '\x1b[31m';
                        break;
                    case 'warning':
                        openColor = '\x1b[33m';
                        break;
                    default:
                        break;
                }
                message += (workflowIndex > 0 ? ', ' : '') + `${openColor}${executionItem.workflowId}${closeColor}`;
            });
            if (process.stdout.isTTY === true) {
                process.stdout.cursorTo(0);
                process.stdout.clearLine(0);
            }
            process.stdout.write(message + '\n');
        });
    }
    initializeLogs() {
        process.stdout.write('**********************************************\n');
        process.stdout.write('              n8n test workflows\n');
        process.stdout.write('**********************************************\n');
        process.stdout.write('\n');
        process.stdout.write('Batch number:\n');
        ExecuteBatch.workflowExecutionsProgress = [];
        for (let i = 0; i < ExecuteBatch.concurrency; i++) {
            ExecuteBatch.workflowExecutionsProgress.push([]);
            process.stdout.write(`${i + 1}: \n`);
        }
    }
    startThread(workflowData) {
        const executionResult = {
            workflowId: workflowData.id,
            workflowName: workflowData.name,
            executionTime: 0,
            finished: false,
            executionStatus: 'running',
            coveredNodes: {},
        };
        const requiredNodeTypes = ['n8n-nodes-base.start'];
        let startNode = undefined;
        for (const node of workflowData.nodes) {
            if (requiredNodeTypes.includes(node.type)) {
                startNode = node;
                break;
            }
        }
        const nodeEdgeCases = {};
        workflowData.nodes.forEach(node => {
            executionResult.coveredNodes[node.type] = (executionResult.coveredNodes[node.type] || 0) + 1;
            if (node.notes !== undefined && node.notes !== '') {
                node.notes.split('\n').forEach(note => {
                    const parts = note.split('=');
                    if (parts.length === 2) {
                        if (nodeEdgeCases[node.name] === undefined) {
                            nodeEdgeCases[node.name] = {};
                        }
                        if (parts[0] === 'CAP_RESULTS_LENGTH') {
                            nodeEdgeCases[node.name].capResults = parseInt(parts[1], 10);
                        }
                        else if (parts[0] === 'IGNORED_PROPERTIES') {
                            nodeEdgeCases[node.name].ignoredProperties = parts[1].split(',').map(property => property.trim());
                        }
                    }
                });
            }
        });
        return new Promise(async (resolve) => {
            if (startNode === undefined) {
                executionResult.error = 'Workflow cannot be started as it does not contain a "Start" node.';
                executionResult.executionStatus = 'warning';
                resolve(executionResult);
            }
            let gotCancel = false;
            const timeoutTimer = setTimeout(() => {
                gotCancel = true;
                executionResult.error = 'Workflow execution timed out.';
                executionResult.executionStatus = 'warning';
                resolve(executionResult);
            }, ExecuteBatch.executionTimeout);
            try {
                const credentials = await src_1.WorkflowCredentials(workflowData.nodes);
                const runData = {
                    credentials,
                    executionMode: 'cli',
                    startNodes: [startNode.name],
                    workflowData: workflowData,
                };
                const workflowRunner = new src_1.WorkflowRunner();
                const executionId = await workflowRunner.run(runData);
                const activeExecutions = src_1.ActiveExecutions.getInstance();
                const data = await activeExecutions.getPostExecutePromise(executionId);
                if (gotCancel || ExecuteBatch.cancelled === true) {
                    clearTimeout(timeoutTimer);
                    return;
                }
                if (data === undefined) {
                    executionResult.error = 'Workflow did not return any data.';
                    executionResult.executionStatus = 'error';
                }
                else {
                    executionResult.executionTime = (Date.parse(data.stoppedAt) - Date.parse(data.startedAt)) / 1000;
                    executionResult.finished = ((data === null || data === void 0 ? void 0 : data.finished) !== undefined);
                    if (data.data.resultData.error) {
                        executionResult.error =
                            data.data.resultData.error.hasOwnProperty('description') ?
                                data.data.resultData.error.description : data.data.resultData.error.message;
                        if (data.data.resultData.lastNodeExecuted !== undefined) {
                            executionResult.error += ` on node ${data.data.resultData.lastNodeExecuted}`;
                        }
                        executionResult.executionStatus = 'error';
                        if (this.shouldBeConsideredAsWarning(executionResult.error || '')) {
                            executionResult.executionStatus = 'warning';
                        }
                    }
                    else {
                        if (ExecuteBatch.shallow === true) {
                            Object.keys(data.data.resultData.runData).map((nodeName) => {
                                data.data.resultData.runData[nodeName].map((taskData) => {
                                    if (taskData.data === undefined) {
                                        return;
                                    }
                                    Object.keys(taskData.data).map(connectionName => {
                                        const connection = taskData.data[connectionName];
                                        connection.map(executionDataArray => {
                                            if (executionDataArray === null) {
                                                return;
                                            }
                                            if (nodeEdgeCases[nodeName] !== undefined && nodeEdgeCases[nodeName].capResults !== undefined) {
                                                executionDataArray.splice(nodeEdgeCases[nodeName].capResults);
                                            }
                                            executionDataArray.map(executionData => {
                                                if (executionData.json === undefined) {
                                                    return;
                                                }
                                                if (nodeEdgeCases[nodeName] !== undefined && nodeEdgeCases[nodeName].ignoredProperties !== undefined) {
                                                    nodeEdgeCases[nodeName].ignoredProperties.forEach(ignoredProperty => delete executionData.json[ignoredProperty]);
                                                }
                                                const jsonProperties = executionData.json;
                                                const nodeOutputAttributes = Object.keys(jsonProperties);
                                                nodeOutputAttributes.map(attributeName => {
                                                    if (Array.isArray(jsonProperties[attributeName])) {
                                                        jsonProperties[attributeName] = ['json array'];
                                                    }
                                                    else if (typeof jsonProperties[attributeName] === 'object') {
                                                        jsonProperties[attributeName] = { object: true };
                                                    }
                                                });
                                            });
                                        });
                                    });
                                });
                            });
                        }
                        else {
                            const specialCases = Object.keys(nodeEdgeCases);
                            specialCases.forEach(nodeName => {
                                data.data.resultData.runData[nodeName].map((taskData) => {
                                    if (taskData.data === undefined) {
                                        return;
                                    }
                                    Object.keys(taskData.data).map(connectionName => {
                                        const connection = taskData.data[connectionName];
                                        connection.map(executionDataArray => {
                                            if (executionDataArray === null) {
                                                return;
                                            }
                                            if (nodeEdgeCases[nodeName].capResults !== undefined) {
                                                executionDataArray.splice(nodeEdgeCases[nodeName].capResults);
                                            }
                                            if (nodeEdgeCases[nodeName].ignoredProperties !== undefined) {
                                                executionDataArray.map(executionData => {
                                                    if (executionData.json === undefined) {
                                                        return;
                                                    }
                                                    nodeEdgeCases[nodeName].ignoredProperties.forEach(ignoredProperty => delete executionData.json[ignoredProperty]);
                                                });
                                            }
                                        });
                                    });
                                });
                            });
                        }
                        const serializedData = this.formatJsonOutput(data);
                        if (ExecuteBatch.compare === undefined) {
                            executionResult.executionStatus = 'success';
                        }
                        else {
                            const fileName = (ExecuteBatch.compare.endsWith(path_1.sep) ? ExecuteBatch.compare : ExecuteBatch.compare + path_1.sep) + `${workflowData.id}-snapshot.json`;
                            if (fs.existsSync(fileName) === true) {
                                const contents = fs.readFileSync(fileName, { encoding: 'utf-8' });
                                const changes = json_diff_1.diff(JSON.parse(contents), data, { keysOnly: true });
                                if (changes !== undefined) {
                                    executionResult.error = `Workflow may contain breaking changes`;
                                    executionResult.changes = changes;
                                    executionResult.executionStatus = 'error';
                                }
                                else {
                                    executionResult.executionStatus = 'success';
                                }
                            }
                            else {
                                executionResult.error = 'Snapshot for not found.';
                                executionResult.executionStatus = 'warning';
                            }
                        }
                        if (ExecuteBatch.snapshot !== undefined) {
                            const fileName = (ExecuteBatch.snapshot.endsWith(path_1.sep) ? ExecuteBatch.snapshot : ExecuteBatch.snapshot + path_1.sep) + `${workflowData.id}-snapshot.json`;
                            fs.writeFileSync(fileName, serializedData);
                        }
                    }
                }
            }
            catch (e) {
                executionResult.error = 'Workflow failed to execute.';
                executionResult.executionStatus = 'error';
            }
            clearTimeout(timeoutTimer);
            resolve(executionResult);
        });
    }
}
exports.ExecuteBatch = ExecuteBatch;
ExecuteBatch.description = '\nExecutes multiple workflows once';
ExecuteBatch.cancelled = false;
ExecuteBatch.shallow = false;
ExecuteBatch.concurrency = 1;
ExecuteBatch.debug = false;
ExecuteBatch.executionTimeout = 3 * 60 * 1000;
ExecuteBatch.examples = [
    `$ n8n executeAll`,
    `$ n8n executeAll --concurrency=10 --skipList=/data/skipList.txt`,
    `$ n8n executeAll --debug --output=/data/output.json`,
    `$ n8n executeAll --ids=10,13,15 --shortOutput`,
    `$ n8n executeAll --snapshot=/data/snapshots --shallow`,
    `$ n8n executeAll --compare=/data/previousExecutionData --retries=2`,
];
ExecuteBatch.flags = {
    help: command_1.flags.help({ char: 'h' }),
    debug: command_1.flags.boolean({
        description: 'Toggles on displaying all errors and debug messages.',
    }),
    ids: command_1.flags.string({
        description: 'Specifies workflow IDs to get executed, separated by a comma.',
    }),
    concurrency: command_1.flags.integer({
        default: 1,
        description: 'How many workflows can run in parallel. Defaults to 1 which means no concurrency.',
    }),
    output: command_1.flags.string({
        description: 'Enable execution saving, You must inform an existing folder to save execution via this param',
    }),
    snapshot: command_1.flags.string({
        description: 'Enables snapshot saving. You must inform an existing folder to save snapshots via this param.',
    }),
    compare: command_1.flags.string({
        description: 'Compares current execution with an existing snapshot. You must inform an existing folder where the snapshots are saved.',
    }),
    shallow: command_1.flags.boolean({
        description: 'Compares only if attributes output from node are the same, with no regards to neste JSON objects.',
    }),
    skipList: command_1.flags.string({
        description: 'File containing a comma separated list of workflow IDs to skip.',
    }),
    retries: command_1.flags.integer({
        description: 'Retries failed workflows up to N tries. Default is 1. Set 0 to disable.',
        default: 1,
    }),
    shortOutput: command_1.flags.boolean({
        description: 'Omits the full execution information from output, displaying only summary.',
    }),
};
//# sourceMappingURL=executeBatch.js.map