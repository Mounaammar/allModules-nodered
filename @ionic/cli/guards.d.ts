import { APIResponse, APIResponseError, APIResponseSuccess, AndroidBuildOutput, App, AppAssociation, AzureDevopsRepoAssociation, BitbucketCloudRepoAssociation, BitbucketServerRepoAssociation, CommandPreRun, CordovaPackageJson, ExitCodeException, GithubBranch, GithubRepo, GithubRepoAssociation, GitlabEnterpriseRepoAssociation, GitlabRepoAssociation, ICommand, IMultiProjectConfig, IProjectConfig, IntegrationName, LegacyAndroidBuildOutputEntry, Login, OpenIdToken, Org, Response, SSHKey, SecurityProfile, Snapshot, StarterManifest, SuperAgentError, TreatableAilment, User } from './definitions';
import { AuthConnection } from './lib/oauth/auth';
export declare const INTEGRATION_NAMES: IntegrationName[];
export declare function isCommand(cmd: any): cmd is ICommand;
export declare function isCommandPreRun(cmd: any): cmd is CommandPreRun;
export declare function isStarterManifest(obj: any): obj is StarterManifest;
export declare function isCordovaPackageJson(obj: any): obj is CordovaPackageJson;
export declare function isLegacyAndroidBuildOutputFile(obj: any): obj is LegacyAndroidBuildOutputEntry[];
export declare function isAndroidBuildOutputFile(obj: any): obj is AndroidBuildOutput;
export declare function isExitCodeException(err: any): err is ExitCodeException;
export declare function isSuperAgentError(err: any): err is SuperAgentError;
export declare function isAPIResponseSuccess(res: any): res is APIResponseSuccess;
export declare function isAPIResponseError(res: any): res is APIResponseError;
export declare function isOrg(org: any): org is Org;
export declare function isGithubRepo(repo: any): repo is GithubRepo;
export declare function isGithubBranch(branch: any): branch is GithubBranch;
export declare function isGithubRepoListResponse(res: any): res is Response<GithubRepo[]>;
export declare function isGithubBranchListResponse(res: any): res is Response<GithubBranch[]>;
export declare function isAppAssociation(association: any): association is AppAssociation;
export declare function isAppAssociationResponse(res: APIResponse): res is Response<AppAssociation>;
export declare function isGithubRepoAssociation(association: any): association is GithubRepoAssociation;
export declare function isGitlabRepoAssociation(association: any): association is GitlabRepoAssociation;
export declare function isGitlabEnterpriseRepoAssociation(association: any): association is GitlabEnterpriseRepoAssociation;
export declare function isBitbucketCloudRepoAssociation(association: any): association is BitbucketCloudRepoAssociation;
export declare function isBitbucketServerRepoAssociation(association: any): association is BitbucketServerRepoAssociation;
export declare function isAzureDevopsRepoAssociation(association: any): association is AzureDevopsRepoAssociation;
export declare function isApp(app: any): app is App;
export declare function isAppResponse(res: APIResponse): res is Response<App>;
export declare function isAppsResponse(res: APIResponse): res is Response<App[]>;
export interface OAuthLogin {
    redirect_url: string;
}
export declare function isOAuthLogin(login: any): login is OAuthLogin;
export declare function isOAuthLoginResponse(res: any): res is Response<OAuthLogin>;
export declare function isOpenIDToken(tokenObj: any): tokenObj is OpenIdToken;
export declare function isOpenIDTokenExchangeResponse(res: any): res is Response<OpenIdToken>;
export declare function isSnapshot(snapshot: any): snapshot is Snapshot;
export declare function isSnapshotResponse(res: APIResponse): res is Response<Snapshot>;
export declare function isSnapshotListResponse(res: APIResponse): res is Response<Snapshot[]>;
export declare function isLogin(login: any): login is Login;
export declare function isLoginResponse(res: APIResponse): res is Response<Login>;
export declare function isAuthConnection(connection: any): connection is AuthConnection;
export declare function isAuthConnectionResponse(res: APIResponse): res is Response<AuthConnection>;
export declare function isUser(user: any): user is User;
export declare function isUserResponse(res: APIResponse): res is Response<User>;
export declare function isSSHKey(key: any): key is SSHKey;
export declare function isSSHKeyListResponse(res: APIResponse): res is Response<SSHKey[]>;
export declare function isSSHKeyResponse(res: APIResponse): res is Response<SSHKey>;
export declare function isSecurityProfile(obj: any): obj is SecurityProfile;
export declare function isSecurityProfileResponse(r: APIResponse): r is Response<SecurityProfile>;
export declare function isTreatableAilment(ailment: any): ailment is TreatableAilment;
export declare function isIntegrationName(name: any): name is IntegrationName;
export declare function isProjectConfig(configFile: any): configFile is IProjectConfig;
export declare function isMultiProjectConfig(configFile: any): configFile is IMultiProjectConfig;