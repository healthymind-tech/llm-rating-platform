import { SessionRating } from '../types';
export declare class RatingService {
    static rateSession(sessionId: string, userId: string, rating: 'like' | 'dislike'): Promise<SessionRating>;
    static getSessionRating(sessionId: string, userId: string): Promise<SessionRating | null>;
    static removeSessionRating(sessionId: string, userId: string): Promise<void>;
    static getRatingStats(): Promise<{
        likes: number;
        dislikes: number;
        total: number;
    }>;
    static getDetailedRatingStats(): Promise<any[]>;
}
//# sourceMappingURL=ratingService.d.ts.map