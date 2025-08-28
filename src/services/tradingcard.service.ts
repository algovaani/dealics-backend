
import { TradingCard } from "../models/tradingcard.model.js";
import { Category } from "../models/category.model.js";
import { User } from "../models/user.model.js";
import { Op, Sequelize } from "sequelize";

export class TradingCardService {
  // Get all TradingCard
  async getAllTradingCards() {
    return await TradingCard.findAll();
  }

  // Get TradingCard by ID
  async getTradingCardById(id: number) {
    return await TradingCard.findByPk(id);
  }

  // Create new TradingCard
  async createTradingCard(data: any) {
    return await TradingCard.create(data);
  }

  // Update Category
//   async updateTradingCard(id: number, data: any) {
//     try {
//       const tradingCard = await TradingCard.findByPk(id);
//       if (!tradingCard) return null;
  
//       await TradingCard.update({
//         code: data.code ?? tradingCard.code,
//         // slug: data.slug ?? category.slug,
//         // sport_icon: data.sport_icon ?? category.sport_icon,
//         // sport_status: data.sport_status ?? category.sport_status,
//         // grades_ungraded_status: data.grades_ungraded_status ?? category.grades_ungraded_status,
//         // csv_cols: data.csv_cols ?? category.csv_cols,
//         // csv_fields: data.csv_fields ?? category.csv_fields
//       });
  
//       return TradingCard;
//     } catch (err) {
//       console.error("Error updating TradingCard:", err);
//       throw err;
//     }
//   }

  // Delete Category
  async deleteTradingCard(id: number) {
    const tradingCard = await TradingCard.findByPk(id);
    if (!tradingCard) return null;
    await TradingCard.destroy();
    return true;
  }

   // Get TradingCards by Category ID
  async getTradingCardsByCategoryId(categorySlug: string, loggedInUserId?: number) {
    const category = await Category.findOne({ where: { slug: categorySlug, sport_status: '1' } });
    if (!category) return null;

    const haveItemSubQuery = Sequelize.literal(`(
      SELECT COUNT(1) FROM trading_cards AS tc_sub
      INNER JOIN categories AS c_sub ON c_sub.id = tc_sub.category_id
      WHERE tc_sub.trading_card_status = '1'
        AND tc_sub.mark_as_deleted IS NULL
        AND tc_sub.is_traded != '1'
        AND tc_sub.is_demo = '0'
        AND c_sub.sport_status = '1'
        ${loggedInUserId ? `AND tc_sub.trader_id <> ${loggedInUserId}` : ''}
        AND tc_sub.category_id = ${category.id}
      LIMIT 1
    )`);

    const tradingCards = await TradingCard.findAll({
      where: {
        category_id: category.id,
        ...(loggedInUserId ? { trader_id: { [Op.ne]: loggedInUserId } } : {})
      },
      include: [
        { model: Category, attributes: ['id', 'slug', 'sport_name'] },
        { model: User, attributes: ['id', 'username'], where: { user_status: '1' }, required: true }
      ],
      attributes: [
        'id', 'code', 'category_id', 'trading_card_img', 
        'trading_card_slug', 'trading_card_estimated_value', 'is_demo',
        [haveItemSubQuery, 'haveitem']
      ],
      order: [['is_demo', 'ASC']]
      // limit: 15
    });

    return tradingCards;
  }
}
