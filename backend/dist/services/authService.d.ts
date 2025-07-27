import { User } from '../types';
export declare class AuthService {
    static login(email: string, password: string): Promise<{
        user: Omit<User, 'password_hash'>;
        token: string;
    } | null>;
    static createUser(username: string, email: string, password: string, role?: 'admin' | 'user'): Promise<Omit<User, 'password_hash'>>;
    static getAllUsers(): Promise<Omit<User, 'password_hash'>[]>;
    static updateUser(userId: string, updates: Partial<Pick<User, 'username' | 'email' | 'role'>>): Promise<Omit<User, 'password_hash'>>;
    static setUserPassword(userId: string, password: string): Promise<void>;
    static getUserTokenUsage(userId: string): Promise<{
        totalTokens: number;
        inputTokens: number;
        outputTokens: number;
        totalSessions: number;
        lastUsage: Date | null;
    }>;
    static getAllUsersWithTokenUsage(): Promise<Array<Omit<User, 'password_hash'> & {
        tokenUsage: {
            totalTokens: number;
            inputTokens: number;
            outputTokens: number;
            totalSessions: number;
            lastUsage: Date | null;
        };
    }>>;
    static deleteUser(userId: string): Promise<void>;
}
//# sourceMappingURL=authService.d.ts.map