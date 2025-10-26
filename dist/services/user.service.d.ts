import { User } from "../models/user.model.js";
export declare class UserService {
    static getUserById(id: number): Promise<User | null>;
    static getUserProfile(userId: number): Promise<{
        user: User;
        cardStats: {
            'All Products': any;
            'Ongoing Deals': any;
            'Successful Trades': number;
            'Products Sold': number;
            'Products Bought': number;
        };
        reviews: object[];
        interestedCardsCount: any;
        tradeCount: any;
        followingCount: any;
    } | null>;
    private static getCardStats;
    private static getTradingCards;
    private static getReviews;
    private static getInterestedCardsCount;
    private static getTradeCount;
    private static getFollowingCount;
    static updateUser(id: number, data: any): Promise<User | null>;
    static deleteUser(id: number): Promise<true | null>;
}
//# sourceMappingURL=user.service.d.ts.map