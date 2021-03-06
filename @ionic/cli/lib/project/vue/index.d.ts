import { Project } from '../';
import { InfoItem } from '../../../definitions';
export declare class VueProject extends Project {
    readonly type: 'vue';
    getInfo(): Promise<InfoItem[]>;
    /**
     * We can't detect Vue project types. We don't know what they look like!
     */
    detected(): Promise<boolean>;
    getDefaultDistDir(): Promise<string>;
    requireBuildRunner(): Promise<import('./build').VueBuildRunner>;
    requireServeRunner(): Promise<import('./serve').VueServeRunner>;
    requireGenerateRunner(): Promise<never>;
    setPrimaryTheme(themeColor: string): Promise<void>;
}
