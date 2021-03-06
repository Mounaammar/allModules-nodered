"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isMultiProjectConfig = exports.isProjectConfig = exports.isIntegrationName = exports.isTreatableAilment = exports.isSecurityProfileResponse = exports.isSecurityProfile = exports.isSSHKeyResponse = exports.isSSHKeyListResponse = exports.isSSHKey = exports.isUserResponse = exports.isUser = exports.isAuthConnectionResponse = exports.isAuthConnection = exports.isLoginResponse = exports.isLogin = exports.isSnapshotListResponse = exports.isSnapshotResponse = exports.isSnapshot = exports.isOpenIDTokenExchangeResponse = exports.isOpenIDToken = exports.isOAuthLoginResponse = exports.isOAuthLogin = exports.isAppsResponse = exports.isAppResponse = exports.isApp = exports.isAzureDevopsRepoAssociation = exports.isBitbucketServerRepoAssociation = exports.isBitbucketCloudRepoAssociation = exports.isGitlabEnterpriseRepoAssociation = exports.isGitlabRepoAssociation = exports.isGithubRepoAssociation = exports.isAppAssociationResponse = exports.isAppAssociation = exports.isGithubBranchListResponse = exports.isGithubRepoListResponse = exports.isGithubBranch = exports.isGithubRepo = exports.isOrg = exports.isAPIResponseError = exports.isAPIResponseSuccess = exports.isSuperAgentError = exports.isExitCodeException = exports.isAndroidBuildOutputFile = exports.isLegacyAndroidBuildOutputFile = exports.isCordovaPackageJson = exports.isStarterManifest = exports.isCommandPreRun = exports.isCommand = exports.INTEGRATION_NAMES = void 0;
exports.INTEGRATION_NAMES = ['capacitor', 'cordova', 'enterprise'];
function isCommand(cmd) {
    return cmd && typeof cmd.run === 'function';
}
exports.isCommand = isCommand;
function isCommandPreRun(cmd) {
    return cmd && typeof cmd.preRun === 'function';
}
exports.isCommandPreRun = isCommandPreRun;
function isStarterManifest(obj) {
    return obj &&
        typeof obj.name === 'string' &&
        typeof obj.baseref === 'string';
}
exports.isStarterManifest = isStarterManifest;
function isCordovaPackageJson(obj) {
    return obj &&
        typeof obj.name === 'string' &&
        typeof obj.cordova === 'object' &&
        Array.isArray(obj.cordova.platforms) &&
        typeof obj.cordova.plugins === 'object';
}
exports.isCordovaPackageJson = isCordovaPackageJson;
function isLegacyAndroidBuildOutputFile(obj) {
    if (!Array.isArray(obj)) {
        return false;
    }
    if (obj.length === 0) {
        return true;
    }
    return obj[0]
        && typeof obj[0].path === 'string'
        && typeof obj[0].outputType === 'object'
        && typeof obj[0].outputType.type === 'string';
}
exports.isLegacyAndroidBuildOutputFile = isLegacyAndroidBuildOutputFile;
function isAndroidBuildOutputFile(obj) {
    return obj &&
        typeof obj.artifactType === 'object' &&
        typeof obj.artifactType.type === 'string' &&
        Array.isArray(obj.elements);
}
exports.isAndroidBuildOutputFile = isAndroidBuildOutputFile;
function isExitCodeException(err) {
    return err && typeof err.exitCode === 'number' && err.exitCode >= 0 && err.exitCode <= 255;
}
exports.isExitCodeException = isExitCodeException;
function isSuperAgentError(err) {
    return err && err.response && typeof err.response === 'object';
}
exports.isSuperAgentError = isSuperAgentError;
function isAPIResponseSuccess(res) {
    return res && (typeof res.data === 'object' || typeof res.data === 'string');
}
exports.isAPIResponseSuccess = isAPIResponseSuccess;
function isAPIResponseError(res) {
    return res && typeof res.error === 'object';
}
exports.isAPIResponseError = isAPIResponseError;
function isOrg(org) {
    return org && typeof org.name === 'string';
}
exports.isOrg = isOrg;
function isGithubRepo(repo) {
    return repo
        && typeof repo.full_name === 'string'
        && typeof repo.id === 'number';
}
exports.isGithubRepo = isGithubRepo;
function isGithubBranch(branch) {
    return branch && typeof branch.name === 'string';
}
exports.isGithubBranch = isGithubBranch;
function isGithubRepoListResponse(res) {
    if (!isAPIResponseSuccess(res) || !Array.isArray(res.data)) {
        return false;
    }
    if (res.data.length === 0) {
        return true;
    }
    return isGithubRepo(res.data[0]);
}
exports.isGithubRepoListResponse = isGithubRepoListResponse;
function isGithubBranchListResponse(res) {
    if (!isAPIResponseSuccess(res) || !Array.isArray(res.data)) {
        return false;
    }
    if (res.data.length === 0) {
        return true;
    }
    return isGithubBranch(res.data[0]);
}
exports.isGithubBranchListResponse = isGithubBranchListResponse;
function isAppAssociation(association) {
    return (association &&
        typeof association.repository === 'object' &&
        typeof association.repository.html_url === 'string' &&
        (isGithubRepoAssociation(association.repository) ||
            isBitbucketCloudRepoAssociation(association.repository) ||
            isBitbucketServerRepoAssociation(association.repository) ||
            isGitlabRepoAssociation(association.repository) ||
            isGitlabEnterpriseRepoAssociation(association.repository) ||
            isAzureDevopsRepoAssociation(association.repository)));
}
exports.isAppAssociation = isAppAssociation;
function isAppAssociationResponse(res) {
    return isAPIResponseSuccess(res)
        && typeof res.data === 'object'
        && isAppAssociation(res.data);
}
exports.isAppAssociationResponse = isAppAssociationResponse;
function isGithubRepoAssociation(association) {
    return association
        && association.type === 'github'
        && typeof association.id === 'number';
}
exports.isGithubRepoAssociation = isGithubRepoAssociation;
function isGitlabRepoAssociation(association) {
    return association
        && association.type === 'gitlab'
        && typeof association.id === 'number';
}
exports.isGitlabRepoAssociation = isGitlabRepoAssociation;
function isGitlabEnterpriseRepoAssociation(association) {
    return association
        && association.type === 'gitlab_enterprise'
        && typeof association.id === 'number';
}
exports.isGitlabEnterpriseRepoAssociation = isGitlabEnterpriseRepoAssociation;
function isBitbucketCloudRepoAssociation(association) {
    return association
        && association.type === 'bitbucket_cloud'
        && typeof association.id === 'string';
}
exports.isBitbucketCloudRepoAssociation = isBitbucketCloudRepoAssociation;
function isBitbucketServerRepoAssociation(association) {
    return association
        && association.type === 'bitbucket_server'
        && typeof association.id === 'number';
}
exports.isBitbucketServerRepoAssociation = isBitbucketServerRepoAssociation;
function isAzureDevopsRepoAssociation(association) {
    return association
        && association.type === 'azure_devops'
        && typeof association.id === 'string';
}
exports.isAzureDevopsRepoAssociation = isAzureDevopsRepoAssociation;
function isApp(app) {
    return app
        && typeof app === 'object'
        && typeof app.id === 'string'
        && typeof app.name === 'string'
        && typeof app.slug === 'string'
        && (!app.org || isOrg(app.org))
        && (!app.association || isAppAssociation(app.association));
}
exports.isApp = isApp;
function isAppResponse(res) {
    return isAPIResponseSuccess(res)
        && typeof res.data === 'object'
        && isApp(res.data);
}
exports.isAppResponse = isAppResponse;
function isAppsResponse(res) {
    if (!isAPIResponseSuccess(res) || !Array.isArray(res.data)) {
        return false;
    }
    if (res.data.length === 0) {
        return true;
    }
    return isApp(res.data[0]);
}
exports.isAppsResponse = isAppsResponse;
function isOAuthLogin(login) {
    return login && typeof login.redirect_url === 'string';
}
exports.isOAuthLogin = isOAuthLogin;
function isOAuthLoginResponse(res) {
    return isAPIResponseSuccess(res) && isOAuthLogin(res.data);
}
exports.isOAuthLoginResponse = isOAuthLoginResponse;
function isOpenIDToken(tokenObj) {
    return tokenObj
        && typeof tokenObj.access_token === 'string'
        && typeof tokenObj.expires_in === 'number'
        && (tokenObj.id_token ? typeof tokenObj.id_token === 'string' : true)
        && (tokenObj.refresh_token ? typeof tokenObj.refresh_token === 'string' : true)
        && tokenObj.scope === 'openid profile email offline_access'
        && tokenObj.token_type === 'Bearer';
}
exports.isOpenIDToken = isOpenIDToken;
function isOpenIDTokenExchangeResponse(res) {
    return res && typeof res.body === 'object' && isOpenIDToken(res.body);
}
exports.isOpenIDTokenExchangeResponse = isOpenIDTokenExchangeResponse;
function isSnapshot(snapshot) {
    return snapshot
        && typeof snapshot.id === 'string'
        && typeof snapshot.sha === 'string'
        && typeof snapshot.ref === 'string'
        && typeof snapshot.state === 'string'
        && typeof snapshot.created === 'string'
        && typeof snapshot.note === 'string';
}
exports.isSnapshot = isSnapshot;
function isSnapshotResponse(res) {
    return isAPIResponseSuccess(res) && isSnapshot(res.data);
}
exports.isSnapshotResponse = isSnapshotResponse;
function isSnapshotListResponse(res) {
    if (!isAPIResponseSuccess(res) || !Array.isArray(res.data)) {
        return false;
    }
    if (res.data.length === 0) {
        return true;
    }
    return isSnapshot(res.data[0]);
}
exports.isSnapshotListResponse = isSnapshotListResponse;
function isLogin(login) {
    return login
        && isUser(login.user)
        && typeof login.token === 'string';
}
exports.isLogin = isLogin;
function isLoginResponse(res) {
    return isAPIResponseSuccess(res) && isLogin(res.data);
}
exports.isLoginResponse = isLoginResponse;
function isAuthConnection(connection) {
    return connection && typeof connection.uuid === 'string';
}
exports.isAuthConnection = isAuthConnection;
function isAuthConnectionResponse(res) {
    return isAPIResponseSuccess(res) && isAuthConnection(res.data);
}
exports.isAuthConnectionResponse = isAuthConnectionResponse;
function isUser(user) {
    return user
        && typeof user.id === 'number'
        && typeof user.email === 'string';
}
exports.isUser = isUser;
function isUserResponse(res) {
    return isAPIResponseSuccess(res) && isUser(res.data);
}
exports.isUserResponse = isUserResponse;
function isSSHKey(key) {
    return key
        && typeof key.id === 'string'
        && typeof key.pubkey === 'string'
        && typeof key.fingerprint === 'string'
        && typeof key.annotation === 'string'
        && typeof key.name === 'string'
        && typeof key.created === 'string'
        && typeof key.updated === 'string';
}
exports.isSSHKey = isSSHKey;
function isSSHKeyListResponse(res) {
    if (!isAPIResponseSuccess(res) || !Array.isArray(res.data)) {
        return false;
    }
    if (res.data.length === 0) {
        return true;
    }
    return isSSHKey(res.data[0]);
}
exports.isSSHKeyListResponse = isSSHKeyListResponse;
function isSSHKeyResponse(res) {
    return isAPIResponseSuccess(res) && isSSHKey(res.data);
}
exports.isSSHKeyResponse = isSSHKeyResponse;
function isSecurityProfile(obj) {
    return obj
        && typeof obj.name === 'string'
        && typeof obj.tag === 'string'
        && typeof obj.type === 'string'
        && typeof obj.created === 'string'
        && typeof obj.credentials === 'object';
}
exports.isSecurityProfile = isSecurityProfile;
function isSecurityProfileResponse(r) {
    const res = r;
    return isAPIResponseSuccess(res) && isSecurityProfile(res.data);
}
exports.isSecurityProfileResponse = isSecurityProfileResponse;
function isTreatableAilment(ailment) {
    return ailment && ailment.treatable && typeof ailment.getTreatmentSteps === 'function';
}
exports.isTreatableAilment = isTreatableAilment;
function isIntegrationName(name) {
    return exports.INTEGRATION_NAMES.includes(name);
}
exports.isIntegrationName = isIntegrationName;
function isProjectConfig(configFile) {
    return configFile
        && typeof configFile.name === 'string'
        && typeof configFile.projects === 'undefined';
}
exports.isProjectConfig = isProjectConfig;
function isMultiProjectConfig(configFile) {
    return configFile
        && typeof configFile.name === 'undefined'
        && typeof configFile.projects === 'object';
}
exports.isMultiProjectConfig = isMultiProjectConfig;
