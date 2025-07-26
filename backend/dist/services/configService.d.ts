import { LLMConfig } from '../types';
export declare class ConfigService {
    static getAllConfigs(): Promise<LLMConfig[]>;
    static getConfigById(id: string): Promise<LLMConfig | null>;
    static createConfig(configData: Omit<LLMConfig, 'id' | 'created_at' | 'updated_at'>): Promise<LLMConfig>;
    static updateConfig(id: string, updates: Partial<Omit<LLMConfig, 'id' | 'created_at' | 'updated_at'>>): Promise<LLMConfig>;
    static deleteConfig(id: string): Promise<void>;
    static setActiveConfig(id: string): Promise<LLMConfig>;
    static getActiveConfig(): Promise<LLMConfig | null>;
    static fetchOpenAIModels(apiKey: string, baseURL?: string): Promise<any[]>;
    static testConfiguration(config: any): Promise<string>;
    private static testOpenAIConfig;
    private static testOllamaConfig;
}
//# sourceMappingURL=configService.d.ts.map