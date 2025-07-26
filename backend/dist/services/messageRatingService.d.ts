export interface MessageRating {
    id: string;
    messageId: string;
    userId: string;
    rating: 'like' | 'dislike';
    reason?: string;
    createdAt: string;
    updatedAt: string;
}
export interface MessageRatingStats {
    likes: number;
    dislikes: number;
    total: number;
}
export declare class MessageRatingService {
    static rateMessage(messageId: string, userId: string, rating: 'like' | 'dislike', reason?: string): Promise<MessageRating>;
    static getMessageRating(messageId: string, userId: string): Promise<MessageRating | null>;
    static removeMessageRating(messageId: string, userId: string): Promise<void>;
    static getRatingStats(): Promise<MessageRatingStats>;
    static getDetailedRatingStats(): Promise<any[]>;
    static getMessagesWithRatings(sessionId: string, userId: string): Promise<any[]>;
}
//# sourceMappingURL=messageRatingService.d.ts.map