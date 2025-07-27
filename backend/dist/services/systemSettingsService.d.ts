import { SystemSetting } from '../types';
export declare class SystemSettingsService {
    static getAllSettings(): Promise<SystemSetting[]>;
    static getSetting(key: string): Promise<SystemSetting | null>;
    static getSettingValue(key: string): Promise<any>;
    static updateSetting(key: string, value: any, type?: string): Promise<SystemSetting>;
    static createSetting(key: string, value: any, type: string, description?: string): Promise<SystemSetting>;
    static deleteSetting(key: string): Promise<void>;
    static updateMultipleSettings(settings: Array<{
        key: string;
        value: any;
    }>): Promise<SystemSetting[]>;
    private static parseSettingValue;
    private static stringifySettingValue;
    static getSystemLanguage(): Promise<string>;
    static setSystemLanguage(language: string): Promise<void>;
}
//# sourceMappingURL=systemSettingsService.d.ts.map