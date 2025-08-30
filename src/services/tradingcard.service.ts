
import { TradingCard } from "../models/tradingcard.model.js";
import { Category } from "../models/category.model.js";
import { User } from "../models/user.model.js";
import { CategoryField } from "../models/category_field.model.js";
import { CardCondition } from "../models/cardCondition.model.js";
import { HelperService } from "./helper.service.js";
import { Op, Sequelize, QueryTypes } from "sequelize";
import { sequelize } from "../config/db.js";

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
        { model: User, attributes: ['id', 'username'], where: { user_status: '1' }, required: true },
        { model: CardCondition, attributes: ['id', 'card_condition_name', 'card_condition_status'] }
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

  // Get authenticated user's trading cards for a category (by slug) with pagination
  async getMyTradingCardsByCategorySlug(
    categorySlug: string,
    userId: number,
    page: number = 1,
    perPage: number = 9
  ) {
    let whereClause: any = {
      trader_id: userId,
      trading_card_status: "1",
      is_traded: { [Op.ne]: "1" },
      mark_as_deleted: { [Op.is]: null },
    };

    // If category is not "all", filter by specific category
    if (categorySlug !== "all") {
      const category = await Category.findOne({ where: { slug: categorySlug } });
      if (!category) return { rows: [], count: 0 };
      whereClause.category_id = category.id;
    }

    const offset = (page - 1) * perPage;

    const result = await TradingCard.findAndCountAll({
      where: whereClause,
      include: [
        { model: Category, attributes: ["id", "slug", "sport_name", "sport_icon"] },
        { model: CardCondition, attributes: ["id", "card_condition_name", "card_condition_status"] }
      ],
      order: [["updated_at", "DESC"]],
      limit: perPage,
      offset,
      attributes: [
        "id",
        "code",
        "category_id",
        "trading_card_img",
        "trading_card_slug",
        "trading_card_estimated_value",
        "updated_at",
      ],
    });

    return result;
  }

  // Helper-equivalent: get categories filtered by whether user has active cards
  async getCategoriesForUser(userId?: number) {
    // Base filter: sport_status = 1
    const baseWhere: any = { sport_status: "1" };

    if (!userId) {
      const categories = await Category.findAll({
        where: baseWhere,
        order: [["sport_name", "ASC"]],
        attributes: ["id", [Sequelize.col("sport_name"), "label"], "slug", "sport_icon"],
      });
      return categories.map((c: any) => c.toJSON());
    }

    // With user filter: use a subquery to find categories that have user's active cards
    const subquery = `SELECT DISTINCT category_id FROM trading_cards 
                      WHERE trader_id = ${userId} 
                        AND trading_card_status = '1' 
                        AND COALESCE(is_traded, '0') != '1' 
                        AND mark_as_deleted IS NULL`;

    const categories = await Category.findAll({
      where: {
        ...baseWhere,
        id: {
          [Op.in]: Sequelize.literal(`(${subquery})`)
        }
      },
      order: [["sport_name", "ASC"]],
      attributes: ["id", [Sequelize.col("sport_name"), "label"], "slug", "sport_icon"],
    });

    return categories.map((c: any) => c.toJSON());
  }

  // Get form fields by category slug for creating trading cards
  async getFormFieldsByCategory(categorySlug: string) {
    // Get category with sport_name as label
    const category = await Category.findOne({ 
      where: { slug: categorySlug },
      attributes: ["id", [Sequelize.col("sport_name"), "label"], "slug"]
    });
    
    if (!category) return null;

    const categoryId = category.id;
    
    // Get category fields ordered by priority
    const categoryFields = await CategoryField.findAll({
      where: { category_id: categoryId },
      order: [['priority', 'ASC']],
      attributes: ['id', 'fields', 'is_required', 'additional_information', 'priority']
    });

    // Get all categories for dropdown
    const categories = await Category.findAll({
      where: { sport_status: "1" },
      order: [["sport_name", "ASC"]],
      attributes: ["id", [Sequelize.col("sport_name"), "label"], "slug"],
    });

    // Process category fields according to Laravel logic
    const categoryFieldCollection: { [key: string]: any[] } = {};
    const categoryAjaxFieldCollection: string[] = [];
    const categoryJSFieldCollection: string[] = [];
    const selectDownMasterDataId: any[] = [];

    // Transform category fields to include item_column data
    const transformedCategoryFields = await Promise.all(categoryFields.map(async (field) => {
      let itemColumn = null;
      
      try {
        // Try different approaches to get item_column data
        
        // Approach 1: Try to find item_column by matching the field name
        if (field.fields) {
          const itemColumnData = await sequelize.query(`
            SELECT 
              id, label, name, type, rel_model_index, rel_master_table, 
              rel_model_fun, rel_model_col, d_class, act_class, 
              do_not_show_on_detail, is_newline, maxlength, input_maxlength,
              is_ajax_load, is_js_load, label_options, placeholder, prefix,
              graded_ungraded, option_values, is_loop, is_highlight, is_link,
              out_of_collapse, is_label_bold, not_for_demo_user,
              created_at, updated_at
            FROM item_columns 
            WHERE name = :fieldName
            LIMIT 1
          `, {
            replacements: { fieldName: field.fields },
            type: QueryTypes.SELECT
          });
          
          if (itemColumnData && itemColumnData.length > 0) {
            itemColumn = itemColumnData[0] as any;
          }
        }
        
        // Approach 2: If no match by name, try to find by other criteria
        if (!itemColumn && field.fields) {
          const itemColumnData = await sequelize.query(`
            SELECT 
              id, label, name, type, rel_model_index, rel_master_table, 
              rel_model_fun, rel_model_col, d_class, act_class, 
              do_not_show_on_detail, is_newline, maxlength, input_maxlength,
              is_ajax_load, is_js_load, label_options, placeholder, prefix,
              graded_ungraded, option_values, is_loop, is_highlight, is_link,
              out_of_collapse, is_label_bold, not_for_demo_user,
              created_at, updated_at
            FROM item_columns 
            WHERE rel_model_index LIKE :fieldName OR rel_master_table LIKE :fieldName
            LIMIT 1
          `, {
            replacements: { fieldName: `%${field.fields}%` },
            type: QueryTypes.SELECT
          });
          
          if (itemColumnData && itemColumnData.length > 0) {
            itemColumn = itemColumnData[0] as any;
          }
        }
        
      } catch (error) {
        console.error(`Error getting item column data for field ${field.id}:`, error);
      }
      
      // Process field categorization logic if item_column data is found
      if (itemColumn && itemColumn.rel_master_table) {
        if (itemColumn.is_js_load === 1) {
          categoryJSFieldCollection.push(itemColumn.name || '');
        } else if (itemColumn.is_ajax_load === 0) {
          // Get master data for non-ajax fields
          const masterData = await HelperService.getMasterDatas(
            itemColumn.rel_master_table, 
            categoryId
          );
          categoryFieldCollection[itemColumn.rel_master_table] = masterData;
        } else if (itemColumn.is_ajax_load === 1) {
          categoryAjaxFieldCollection.push(itemColumn.name || '');
        }
      }
      
      return {
        fields: field.fields,
        is_required: field.is_required,
        additional_information: field.additional_information,
        priority: field.priority,
        item_column: itemColumn
      };
    }));

    return {
      category_id: categoryId,
      CategoryField: transformedCategoryFields,
      CategoryFieldCollection: categoryFieldCollection,
      SelectDownMasterDataId: selectDownMasterDataId,
      CategoryAjaxFieldCollection: categoryAjaxFieldCollection,
      CategoryJSFieldCollection: categoryJSFieldCollection,
      category: category.toJSON(),
      categories: categories.map((c: any) => c.toJSON())
    };
  }

  // Get all card conditions
  async getAllCardConditions() {
    try {
      const cardConditions = await CardCondition.findAll({
        where: { card_condition_status: '1' },
        order: [['card_condition_name', 'ASC']],
        attributes: ['id', 'card_condition_name', 'card_condition_status', 'created_at', 'updated_at']
      });
      
      return cardConditions;
    } catch (error) {
      console.error('Error getting card conditions:', error);
      throw error;
    }
  }

  // Get card condition by ID
  async getCardConditionById(id: number) {
    try {
      const cardCondition = await CardCondition.findByPk(id);
      return cardCondition;
    } catch (error) {
      console.error('Error getting card condition by ID:', error);
      throw error;
    }
  }
}
