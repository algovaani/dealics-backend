
import { TradingCard, Category, User, CategoryField, CardCondition, CardImage } from "../models/index.js";
import { HelperService } from "./helper.service.js";
import { Sequelize, QueryTypes, Op } from "sequelize";
import { sequelize } from "../config/db.js";

export class TradingCardService {
  // Get all TradingCard with pagination and category_name
    async getAllTradingCards(page: number = 1, perPage: number = 10, categoryId?: number, loggedInUserId?: number) {
    // Validate and sanitize input parameters
    const validPage = isNaN(page) || page < 1 ? 1 : page;
    const validPerPage = isNaN(perPage) || perPage < 1 ? 10 : perPage;
    const validCategoryId = categoryId && !isNaN(categoryId) && categoryId > 0 ? categoryId : null;
    const validLoggedInUserId = loggedInUserId && !isNaN(loggedInUserId) && loggedInUserId > 0 ? loggedInUserId : null;
    
    const offset = (validPage - 1) * validPerPage;
    let whereClause = 'WHERE tc.trading_card_status = 1 AND tc.mark_as_deleted IS NULL AND c.sport_status = 1 AND tc.is_demo=0 AND tc.is_traded!=1';
    if (validCategoryId) {
      whereClause += ` AND tc.category_id = ${validCategoryId}`;
    }

    // Use raw SQL to get data with sport_name and interested_in status
    let interestedJoin = '';
    if (validLoggedInUserId) {
      interestedJoin = `LEFT JOIN interested_in ii ON tc.id = ii.trading_card_id AND ii.user_id = ${validLoggedInUserId}`;
    } else {
      interestedJoin = 'LEFT JOIN interested_in ii ON 1=0'; // This will never match, so interested_in will always be false
    }
    
    const rawQuery = `
      SELECT 
        tc.id,
        tc.category_id,
        tc.trading_card_img,
        tc.trading_card_img_back,
        tc.trading_card_slug,
        tc.trading_card_recent_trade_value,
        tc.trading_card_asking_price,
        tc.search_param,
        c.sport_name,
        tc.trader_id,
        tc.creator_id,
        tc.is_traded,
        tc.can_trade,
        tc.can_buy,
        CASE WHEN ii.id IS NOT NULL THEN true ELSE false END as interested_in
      FROM trading_cards tc
      LEFT JOIN categories c ON tc.category_id = c.id
      ${interestedJoin}
      ${whereClause}
      ORDER BY tc.created_at DESC
      LIMIT ${validPerPage} OFFSET ${offset}
    `;
    
    const countQuery = `
      SELECT COUNT(*) as total
      FROM trading_cards tc
      LEFT JOIN categories c ON tc.category_id = c.id
      ${whereClause}
    `;

    const results = await sequelize.query(rawQuery, {
      type: QueryTypes.SELECT
    });
    
    const countResults = await sequelize.query(countQuery, {
      type: QueryTypes.SELECT
    });

    return {
      status: true,
      message: "Trading cards fetched successfully",
      data: results as any[],
      count: (countResults[0] as any)?.total ?? 0
    };
  }
  async getTradingCardById(id: number, loggedInUserId?: number) {
    // Validate the id parameter
    if (!id || isNaN(id) || id <= 0) {
      console.log("getTradingCardById - Invalid id provided:", id);
      return null;
    }
    
    // Get the trading card with basic data
    const tradingCard = await TradingCard.findByPk(id, {
      attributes: [
        'id',
        'code',
        'trading_card_status',
        'category_id',
        'search_param',
        'trading_card_img',
        'trading_card_img_back',
        'trading_card_slug',
        'is_traded',
        'created_at',
        'is_demo',
        'trader_id',
        'trading_card_asking_price',
        'trading_card_estimated_value',
        'trading_card_recent_sell_link',
        'trading_card_recent_trade_value',
        'can_trade',
        'can_buy'
      ],
      include: [
        {
          model: User,
          as: 'trader',
          attributes: ['username'],
          where: { user_status: '1' },
          required: false
        }
      ]
    });

    if (!tradingCard) {
      return null;
    }

    // Get card images for this trading card using the CardImage model
    const cardImagesData = await CardImage.findAll({
      where: { 
        mainCardId: id,
        cardImageStatus: '1'
      },
      order: [['id', 'ASC']],
      attributes: [
        'id',
        'mainCardId',
        'traderId',
        'cardImage1',
        'cardImage2', 
        'cardImage3',
        'cardImage4',
        'cardImageStatus',
        'createdAt',
        'updatedAt'
      ]
    });

    // Transform card images to a single object with images array
    const cardImages: {
      id: number | null;
      mainCardId: number | null;
      images: string[];
    } = {
      id: cardImagesData.length > 0 ? (cardImagesData[0] as any)?.id || null : null,
      mainCardId: cardImagesData.length > 0 ? (cardImagesData[0] as any)?.mainCardId || null : null,
      images: []
    };

    // Extract all non-null images from all card image records
    cardImagesData.forEach(cardImage => {
      if (cardImage.cardImage1) cardImages.images.push(cardImage.cardImage1);
      if (cardImage.cardImage2) cardImages.images.push(cardImage.cardImage2);
      if (cardImage.cardImage3) cardImages.images.push(cardImage.cardImage3);
      if (cardImage.cardImage4) cardImages.images.push(cardImage.cardImage4);
    });

    // Get all trading card data to extract non-null fields
    const allTradingCardData = await TradingCard.findByPk(id, {
      include: [
        {
          model: User,
          as: 'trader',
          attributes: ['username'],
          where: { user_status: '1' },
          required: false
        }
      ]
    });

    // Extract all non-null fields from trading card with related data
    const additionalFields: any[] = [];
    if (allTradingCardData) {
      const cardData = allTradingCardData.toJSON() as any;
      
      // Get all field names from the trading card model
      const allFieldNames = Object.keys(cardData);
      
             // Filter out null/undefined values and exclude basic fields that are already in main response
       const basicFields = ['id', 'code', 'trading_card_status', 'category_id', 'search_param', 
                           'trading_card_img', 'trading_card_img_back', 'trading_card_slug', 
                           'is_traded', 'created_at', 'is_demo', 'trader_id', 
                           'trading_card_asking_price', 'trading_card_estimated_value', 
                           'trading_card_recent_sell_link', 'trading_card_recent_trade_value', 
                           'can_trade', 'can_buy', 'trader'];
      
      for (const fieldName of allFieldNames) {
        if (!basicFields.includes(fieldName) && 
            cardData[fieldName] !== null && 
            cardData[fieldName] !== undefined && 
            cardData[fieldName] !== '' &&
            cardData[fieldName] !== 0 && cardData[fieldName] !== '0') {
          
                     // Get field label from item_columns table
           const fieldLabel = await this.getFieldLabel(fieldName);
           
                       // Check if this field has a relationship (ends with _id)
            if (fieldName.endsWith('_id')) {
              let relatedTableName: string;
              
              if (fieldName === 'card_condition_id') {
                relatedTableName = 'condition';
              } else {
                relatedTableName = fieldName.replace('_id', '');
              }
              
              const relatedValue = await this.getRelatedValue(relatedTableName, cardData[fieldName]);
              
              additionalFields.push({
                field_name: fieldName,
                field_value: cardData[fieldName],
                field_label: fieldLabel,
                related_field_name: relatedTableName,
                related_field_value: relatedValue
              });
            } else {
              additionalFields.push({
                field_name: fieldName,
                field_value: cardData[fieldName],
                field_label: fieldLabel
              });
            }
        }
      }
    }

    // Check if user can trade or make offers
    let canTradeOrOffer = false;
    console.log("loggedInUserId",loggedInUserId);
    // If can_buy and can_trade are both 0 (as number) or '0' (as string), user can't trade or make offers
    // But if is_traded is falsy (0 or '0'), user can trade or make offers
    if(loggedInUserId && tradingCard.trader_id === loggedInUserId){
      canTradeOrOffer = false;
    }else if(tradingCard && (tradingCard.is_traded == '0') ) {
      canTradeOrOffer = true;
    }

    return {
      tradingCard,
      additionalFields: additionalFields,
      cardImages: cardImages,
      canTradeOrOffer: canTradeOrOffer
    };
  }

  // Helper method to load related data
  private async loadRelatedData(
    tradingCard: any,
    relationFunction: string,
    relationColumn: string,
    categoryId: number
  ) {
    try {
      // This is a simplified implementation
      // You may need to implement specific relation loading logic based on your needs
      const fieldValue = (tradingCard as any)[relationColumn];
      
      if (fieldValue) {
        // Example: Load master data for the field
        const masterData = await HelperService.getMasterDatas(relationFunction, categoryId);
        return masterData.find((item: any) => item.id === fieldValue) || null;
      }
      
      return null;
    } catch (error) {
      console.error('Error loading related data:', error);
      return null;
    }
  }

  // Helper method to get field label from item_columns table
  private async getFieldLabel(fieldName: string): Promise<string | null> {
    try {
      const query = `
        SELECT label
        FROM item_columns
        WHERE name = :fieldName
        LIMIT 1
      `;

      const result = await sequelize.query(query, {
        replacements: { fieldName },
        type: QueryTypes.SELECT
      });

      return result.length > 0 && result[0] ? (result[0] as any).label : null;
    } catch (error) {
      console.error(`Error getting field label for ${fieldName}:`, error);
      return null;
    }
  }

  // Helper method to get related value from other tables
  private async getRelatedValue(tableName: string, id: number): Promise<any> {
    try {
      // Define common table relationships and their display fields
      const tableConfigs: { [key: string]: { table: string; displayField: string; idField?: string } } = {
        'player': { table: 'players', displayField: 'player_name', idField: 'id' },
        'team': { table: 'teams', displayField: 'team_name', idField: 'id' },
        'brand': { table: 'brands', displayField: 'brand_name', idField: 'id' },
        'year': { table: 'years', displayField: 'year_name', idField: 'id' },
        'condition': { table: 'card_conditions', displayField: 'card_condition_name', idField: 'id' },
        'grade': { table: 'grades', displayField: 'grade_name', idField: 'id' },
        'sport': { table: 'sports', displayField: 'sport_name', idField: 'id' },
        'league': { table: 'leagues', displayField: 'league_name', idField: 'id' },
        'set': { table: 'sets', displayField: 'set_name', idField: 'id' },
        'manufacturer': { table: 'manufacturers', displayField: 'manufacturer_name', idField: 'id' }
      };

      const config = tableConfigs[tableName];
      if (!config) {
        return null;
      }

      const query = `
        SELECT ${config.displayField} as display_value
        FROM ${config.table}
        WHERE ${config.idField || 'id'} = :id
        LIMIT 1
      `;

      const result = await sequelize.query(query, {
        replacements: { id },
        type: QueryTypes.SELECT
      });

      return result.length > 0 && result[0] ? (result[0] as any).display_value : null;
    } catch (error) {
      console.error(`Error getting related value for ${tableName} with id ${id}:`, error);
      return null;
    }
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
    // Validate the id parameter
    if (!id || isNaN(id) || id <= 0) {
      console.log("deleteTradingCard - Invalid id provided:", id);
      return false;
    }
    
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
        'id', 'code', 'category_id', 'trading_card_img','search_param', 
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
        "trader_id",
        "is_traded"
      ],
    });

    return result;
  }

  // Get all trading cards for a category (by slug) with pagination - no authentication required
  async getAllTradingCardsByCategorySlug(
    categorySlug: string,
    page: number = 1,
    perPage: number = 9
  ) {
    let whereClause: any = {
      trading_card_status: "1",
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
        { model: CardCondition, attributes: ["id", "card_condition_name", "card_condition_status"] },
        { model: User, attributes: ["id", "username"], where: { user_status: '1' }, required: false }
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
        "trader_id",
        "is_traded"
      ],
    });

    return result;
  }

  // Get public profile trading cards for a specific user
  async getPublicProfileTradingCards(
    userId: number,
    page: number = 1,
    perPage: number = 10,
    loggedInUserId?: number,
    categoryId?: number
  ) {
    // Validate and sanitize input parameters
    const validUserId = userId && !isNaN(userId) && userId > 0 ? userId : null;
    const validPage = isNaN(page) || page < 1 ? 1 : page;
    const validPerPage = isNaN(perPage) || perPage < 1 ? 10 : perPage;
    const validLoggedInUserId = loggedInUserId && !isNaN(loggedInUserId) && loggedInUserId > 0 ? loggedInUserId : null;
    const validCategoryId = categoryId && !isNaN(categoryId) && categoryId > 0 ? categoryId : null;
    
    if (!validUserId) {
      return {
        status: false,
        message: "Valid user ID is required",
        data: [],
        count: 0
      };
    }
    
    const offset = (validPage - 1) * validPerPage;
    
    // Use raw SQL to get data with sport_name and interested_in status
    let interestedJoin = '';
    if (validLoggedInUserId) {
      interestedJoin = `LEFT JOIN interested_in ii ON tc.id = ii.trading_card_id AND ii.user_id = ${validLoggedInUserId}`;
    } else {
      interestedJoin = 'LEFT JOIN interested_in ii ON 1=0'; // This will never match, so interested_in will always be false
    }
    
    const rawQuery = `
      SELECT 
        tc.id,
        tc.category_id,
        tc.trading_card_img,
        tc.trading_card_img_back,
        tc.trading_card_slug,
        tc.trading_card_recent_trade_value,
        tc.trading_card_asking_price,
        tc.search_param,
        c.sport_name,
        tc.trader_id,
        tc.creator_id,
        tc.is_traded,
        tc.can_trade,
        tc.can_buy,
        CASE WHEN ii.id IS NOT NULL THEN true ELSE false END as interested_in
      FROM trading_cards tc
      LEFT JOIN categories c ON tc.category_id = c.id
      ${interestedJoin}
      WHERE tc.creator_id = ${validUserId}
        AND tc.trading_card_status = '1'
        AND tc.mark_as_deleted IS NULL
        AND tc.is_traded != '1'
        ${validCategoryId ? `AND tc.category_id = ${validCategoryId}` : ''}
      ORDER BY tc.created_at DESC
      LIMIT ${validPerPage} OFFSET ${offset}
    `;
    
    const countQuery = `
      SELECT COUNT(*) as total
      FROM trading_cards tc
      WHERE tc.creator_id = ${validUserId}
        AND tc.trading_card_status = '1'
        AND tc.mark_as_deleted IS NULL
        AND tc.is_traded != '1'
        ${validCategoryId ? `AND tc.category_id = ${validCategoryId}` : ''}
    `;

    const results = await sequelize.query(rawQuery, {
      type: QueryTypes.SELECT
    });
    
    const countResults = await sequelize.query(countQuery, {
      type: QueryTypes.SELECT
    });

    return {
      status: true,
      message: "Public profile trading cards fetched successfully",
      data: results as any[],
      count: (countResults[0] as any)?.total ?? 0
    };
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
    const validUserId = userId && !isNaN(userId) && userId > 0 ? userId : null;
    if (!validUserId) {
      return [];
    }
    
    const subquery = `SELECT DISTINCT category_id FROM trading_cards 
                      WHERE trader_id = ${validUserId} 
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

  /**
   * Save trading card with master data processing (equivalent to Laravel saveProductData)
   */
  async saveTradingCard(
    requestData: any,
    categoryId: number,
    userId: number
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // Base save data
      const saveData: any = {
        creator_id: userId,
        trader_id: userId,
        category_id: categoryId,
      };

      // Get category fields with priority
      const categoryFields = await CategoryField.findAll({
        where: { category_id: categoryId },
        order: [['priority', 'ASC']],
        attributes: ['fields', 'is_required', 'additional_information']
      });

      // Process category fields
      const productAttributes: any = {};
      const markAsTitleArr: any = {};
      const markAsTitleColsArr: string[] = [];

      for (const cField of categoryFields) {
        const fieldName = cField.fields;
        
        if (fieldName && requestData[fieldName] !== undefined) {
          saveData[fieldName] = requestData[fieldName];
        }

        // Handle mark as title logic
        if (fieldName && cField.additional_information) {
          try {
            const additionalInfo = JSON.parse(cField.additional_information);
            if (additionalInfo.mark_as_title === 1) {
              markAsTitleColsArr.push(fieldName);
              
              if (requestData[fieldName] && requestData[fieldName].trim()) {
                markAsTitleArr[fieldName] = {
                  value: requestData[fieldName]
                };
              }

              // Get item column data for prefix and type
              const itemColumnData = await HelperService.getMasterDatas('item_columns', categoryId);
              const itemColumn = itemColumnData.find((item: any) => item.name === fieldName);
              
              if (itemColumn) {
                if (itemColumn.prefix) {
                  markAsTitleArr[fieldName].prefix = itemColumn.prefix;
                }

                if (itemColumn.type === 'select' || itemColumn.type === 'autocomplete') {
                  const textFieldName = `${fieldName}_text`;
                  if (requestData[textFieldName] && requestData[textFieldName].trim()) {
                    markAsTitleArr[fieldName].value = requestData[textFieldName];
                  } else {
                    markAsTitleArr[fieldName].rel_model_fun = itemColumn.rel_model_fun || null;
                    markAsTitleArr[fieldName].rel_model_col = itemColumn.rel_model_col || null;
                  }
                }
              }
            }
          } catch (parseError) {
            console.log(`Could not parse additional_information for field ${fieldName}`);
          }
        }

        // Handle select/autocomplete fields with master data
        if (fieldName) {
          const textFieldName = `${fieldName}_text`;
          if (requestData[textFieldName] && requestData[textFieldName].trim()) {
            // Get item column data to check field type
            const itemColumnData = await HelperService.getMasterDatas('item_columns', categoryId);
            const itemColumn = itemColumnData.find((item: any) => item.name === fieldName);
            
            if (itemColumn && (itemColumn.type === 'select' || itemColumn.type === 'autocomplete')) {
              const masterId = await HelperService.saveMasterDataAndReturnMasterId(
                requestData[textFieldName],
                fieldName,
                categoryId
              );
              
              if (masterId > 0) {
                saveData[fieldName] = masterId;
              }
            }
          }
        }
      }

      // Create trading card
      const tradingCard = await TradingCard.create(saveData);

      if (!tradingCard.id) {
        throw new Error("Failed to create TradingCard record");
      }

      // Store additional data for response
      const result = {
        tradingCard,
        markAsTitleArr,
        markAsTitleColsArr,
        productAttributes
      };

      return {
        success: true,
        data: result
      };

    } catch (error: any) {
      console.error('Error saving trading card:', error);
      return {
        success: false,
        error: error.message || 'Unknown error occurred'
      };
    }
  }

  /**
   * Update trading card (equivalent to Laravel update_trade_card)
   */
  async updateTradingCard(
    cardId: number,
    requestData: any,
    userId: number
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // Find the existing trading card
      const existingCard = await TradingCard.findByPk(cardId);
      if (!existingCard) {
        return { success: false, error: "Trading card not found" };
      }

      const categoryId = existingCard.category_id;
      if (!categoryId) {
        return { success: false, error: "Category ID not found" };
      }

      // Prepare base save data - only include fields that are actually being updated
      const saveData: any = {};

      // Get category fields with priority
      const categoryFields = await CategoryField.findAll({
        where: { category_id: categoryId },
        order: [['priority', 'ASC']],
        attributes: ['fields', 'is_required', 'additional_information', 'mark_as_title']
      });

      // Process category fields
      const productAttributes: any = {};
      const markAsTitleArr: any = {};
      const markAsTitleColsArr: string[] = [];

      for (const cField of categoryFields) {
        const fieldName = cField.fields;
        
        if (fieldName && requestData[fieldName] !== undefined) {
          // Handle boolean fields (convert '1' to 1, others to 0)
          if (requestData[fieldName] === '1') {
            saveData[fieldName as string] = 1;
          } else {
            saveData[fieldName as string] = 0;
          }
        }
        // Don't set default values for fields not provided - this is PATCH behavior

        // Handle mark as title logic
        if (cField.mark_as_title === true && fieldName) {
          markAsTitleColsArr.push(fieldName);
          
          if (requestData[fieldName] && requestData[fieldName].trim()) {
            markAsTitleArr[fieldName] = {
              value: requestData[fieldName]
            };
          }

          // Handle select/autocomplete fields for title
          const textFieldName = `${fieldName}_text`;
          if (requestData[textFieldName] && requestData[textFieldName].trim()) {
            markAsTitleArr[fieldName] = {
              value: requestData[textFieldName]
            };
          }
        }

        // Handle select/autocomplete fields with master data
        if (fieldName) {
          const textFieldName = `${fieldName}_text`;
          if (requestData[textFieldName] && requestData[textFieldName].trim()) {
            // Get item column data to check field type
            const itemColumnData = await HelperService.getMasterDatas('item_columns', categoryId);
            const itemColumn = itemColumnData.find((item: any) => item.name === fieldName);
            
            if (itemColumn && (itemColumn.type === 'select' || itemColumn.type === 'autocomplete')) {
              const masterId = await HelperService.saveMasterDataAndReturnMasterId(
                requestData[textFieldName],
                fieldName,
                categoryId
              );
              
              if (masterId > 0) {
                saveData[fieldName] = masterId;
              }
            }
          }
        }
      }

      // Handle file uploads - only update if files are provided
      if (requestData.trading_card_img !== undefined) {
        saveData.trading_card_img = requestData.trading_card_img;
      }
      if (requestData.trading_card_img_back !== undefined) {
        saveData.trading_card_img_back = requestData.trading_card_img_back;
      }

      // Check if we have any data to update
      if (Object.keys(saveData).length === 0) {
        return { success: false, error: "No data provided for update" };
      }

      // Update the trading card
      await TradingCard.update(saveData, { where: { id: cardId } });

      // Generate search parameters and slug
      let searchParam = '';
      let tradingCardSlug = '';
      
      if (Object.keys(markAsTitleArr).length > 0) {
        const slugData = await this.createProductSearchParametersAndSlug(
          markAsTitleArr, 
          cardId, 
          markAsTitleColsArr
        );
        searchParam = slugData.search_param;
        tradingCardSlug = slugData.trading_card_slug;
      }

      // Update search parameters and slug
      await TradingCard.update(
        { 
          search_param: searchParam,
          trading_card_slug: tradingCardSlug 
        },
        { where: { id: cardId } }
      );

      // Handle product attributes
      if (Object.keys(productAttributes).length > 0) {
        // You'll need to implement ProductAttribute model
        // For now, we'll skip this part
        console.log('Product attributes to save:', productAttributes);
      }

      // Handle card images - only update if provided
      const cardImagesData: any = {};
      if (requestData.icon1 !== undefined) cardImagesData.card_image_1 = requestData.icon1;
      if (requestData.icon2 !== undefined) cardImagesData.card_image_2 = requestData.icon2;
      if (requestData.icon3 !== undefined) cardImagesData.card_image_3 = requestData.icon3;
      if (requestData.icon4 !== undefined) cardImagesData.card_image_4 = requestData.icon4;

      if (Object.keys(cardImagesData).length > 0) {
        // You'll need to implement CardImages model
        console.log('Card images to save:', cardImagesData);
      }

      // Get updated trading card
      const updatedCard = await TradingCard.findByPk(cardId);

      return {
        success: true,
        data: {
          tradingCard: updatedCard,
          message: "Trading card updated successfully"
        }
      };

    } catch (error: any) {
      console.error('Error updating trading card:', error);
      return {
        success: false,
        error: error.message || 'Unknown error occurred'
      };
    }
  }

  /**
   * Create product search parameters and slug (equivalent to Laravel ____createProductSearchParametersAndSlug)
   */
  private async createProductSearchParametersAndSlug(
    markAsTitleArr: any,
    cardId: number,
    markAsTitleColsArr: string[]
  ): Promise<{ search_param: string; trading_card_slug: string }> {
    try {
      // This is a simplified version - you'll need to implement the full logic
      const searchParam = Object.values(markAsTitleArr)
        .map((value: any) => value.value || value)
        .filter(Boolean)
        .join(' ');
      
      const tradingCardSlug = Object.values(markAsTitleArr)
        .map((value: any) => value.value || value)
        .filter(Boolean)
        .join('-')
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

      return {
        search_param: searchParam,
        trading_card_slug: tradingCardSlug
      };
    } catch (error) {
      console.error('Error creating search parameters and slug:', error);
      return {
        search_param: '',
        trading_card_slug: ''
      };
    }
  }

  /**
   * Simple method to populate search_param for existing trading cards
   */
  async populateSearchParams() {
    try {
      // Use raw SQL to update search_param for all trading cards
      const result = await sequelize.query(`
        UPDATE trading_cards 
        SET search_param = CONCAT(
          COALESCE(trading_card_slug, ''),
          ' ',
          COALESCE(code, ''),
          ' ',
          COALESCE(trading_card_estimated_value, '')
        )
        WHERE search_param IS NULL OR search_param = ''
      `, {
        type: QueryTypes.UPDATE
      });

      console.log('Updated search_param for trading cards');
      return true;
    } catch (error) {
      console.error('Error populating search parameters:', error);
      throw error;
    }
  }

  /**
   * Update search parameters for existing cards (for the controller)
   */
  async updateSearchParamsForExistingCards(): Promise<number> {
    try {
      const result = await sequelize.query(`
        UPDATE trading_cards 
        SET search_param = CONCAT(
          COALESCE(trading_card_slug, ''),
          ' ',
          COALESCE(code, ''),
          ' ',
          COALESCE(trading_card_estimated_value, '')
        )
        WHERE search_param IS NULL OR search_param = ''
      `, {
        type: QueryTypes.UPDATE
      });

      return result[1] as number; // Number of affected rows
    } catch (error) {
      console.error('Error updating search parameters:', error);
      throw error;
    }
  }

  /**
   * Get popular trading cards based on interested_in count and is_traded = 0
   */
  static async getPopularTradingCards(limit: number = 10) {
    try {
      const query = `
        SELECT
          tc.id,
          tc.trading_card_img,
          tc.trading_card_img_back,
          tc.trading_card_slug,
          tc.trading_card_recent_trade_value,
          tc.trading_card_asking_price,
          tc.search_param,
          tc.is_traded,
          c.sport_name,
          CASE 
            WHEN tc.card_condition_id IS NOT NULL THEN cc.card_condition_name
            WHEN tc.video_game_condition IS NOT NULL THEN tc.video_game_condition
            WHEN tc.console_condition IS NOT NULL THEN tc.console_condition
            WHEN tc.gum_condition IS NOT NULL THEN tc.gum_condition
            ELSE NULL
          END as card_condition
        FROM trading_cards tc
        LEFT JOIN categories c ON tc.category_id = c.id
        LEFT JOIN card_conditions cc ON tc.card_condition_id = cc.id
        LEFT JOIN (
          SELECT
            trading_card_id,
            COUNT(*) as interested_count
          FROM interested_in
          GROUP BY trading_card_id
        ) interest_count ON tc.id = interest_count.trading_card_id
        WHERE tc.trading_card_status = '1'
        AND tc.mark_as_deleted IS NULL
        AND tc.is_traded = '0'
        AND tc.is_demo = '0'
        AND c.sport_status = '1'
        AND (tc.can_trade = 1 OR tc.can_buy = 1)
        ORDER BY
          interested_count DESC,
          tc.created_at DESC
        LIMIT :limit
      `;

      const result = await sequelize.query(query, {
        replacements: { limit },
        type: QueryTypes.SELECT
      });

      return result;
    } catch (error) {
      console.error('Error getting popular trading cards:', error);
      return [];
    }
  }

  /**
   * Main search API - supports both image upload and text search
   */
  static async mainSearch(searchText: string, limit: number = 10) {
    try {
      const query = `
        SELECT
          tc.id,
          tc.trading_card_img,
          tc.trading_card_img_back,
          tc.trading_card_slug,
          tc.trading_card_recent_trade_value,
          tc.trading_card_asking_price,
          tc.search_param,
          tc.is_traded,
          c.sport_name,
          CASE 
            WHEN tc.card_condition_id IS NOT NULL THEN cc.card_condition_name
            WHEN tc.video_game_condition IS NOT NULL THEN tc.video_game_condition
            WHEN tc.console_condition IS NOT NULL THEN tc.console_condition
            WHEN tc.gum_condition IS NOT NULL THEN tc.gum_condition
            ELSE NULL
          END as card_condition
        FROM trading_cards tc
        LEFT JOIN categories c ON tc.category_id = c.id
        LEFT JOIN card_conditions cc ON tc.card_condition_id = cc.id
        WHERE tc.trading_card_status = '1'
        AND tc.mark_as_deleted IS NULL
        AND tc.is_traded = '0'
        AND tc.is_demo = '0'
        AND c.sport_status = '1'
        AND (tc.can_trade = 1 OR tc.can_buy = 1)
        AND tc.search_param LIKE :searchText
        ORDER BY tc.created_at DESC
        LIMIT :limit
      `;

      const result = await sequelize.query(query, {
        replacements: { 
          searchText: `%${searchText}%`,
          limit 
        },
        type: QueryTypes.SELECT
      });

      return result;
    } catch (error) {
      console.error('Error in main search:', error);
      return [];
    }
  }
}
