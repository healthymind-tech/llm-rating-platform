export interface UserProfile {
    id: string;
    username: string;
    email: string;
    role: string;
    height?: number;
    weight?: number;
    body_fat?: number;
    lifestyle_habits?: string;
    profile_completed: boolean;
    include_body_in_prompts: boolean;
    created_at: string;
    last_login?: string;
}
export interface UpdateProfileData {
    height?: number;
    weight?: number;
    body_fat?: number;
    lifestyle_habits?: string;
    include_body_in_prompts?: boolean;
}
declare class UserProfileService {
    getUserProfile(userId: string): Promise<UserProfile | null>;
    updateUserProfile(userId: string, profileData: UpdateProfileData): Promise<UserProfile>;
    checkProfileCompletion(userId: string): Promise<boolean>;
    getUserProfileForLLM(userId: string): Promise<string>;
    isBodyInfoRequired(): Promise<boolean>;
}
export declare const userProfileService: UserProfileService;
export {};
//# sourceMappingURL=userProfileService.d.ts.map