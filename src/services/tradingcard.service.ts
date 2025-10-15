import { TradingCard, Category, User, CategoryField, CardCondition, CardImage, InterestedIn, PublicationYear } from "../models/index.js";
import { HelperService } from "./helper.service.js";
import { Sequelize, QueryTypes, Op } from "sequelize";
import { sequelize } from "../config/db.js";

export class TradingCardService {
  // Get all trading cards EXCEPT user's own cards (for public listing)
  async getAllTradingCardsExceptOwn(page: number = 1, perPage: number = 10, categoryId?: number, loggedInUserId?: number, graded?: string) {
    try {
    // Validate and sanitize input parameters
    const validPage = isNaN(page) || page < 1 ? 1 : page;
    const validPerPage = isNaN(perPage) || perPage < 1 ? 10 : perPage;
    const validCategoryId = categoryId && !isNaN(categoryId) && categoryId > 0 ? categoryId : null;
    const validLoggedInUserId = loggedInUserId && !isNaN(loggedInUserId) && loggedInUserId > 0 ? loggedInUserId : null;
    const validGraded = graded && (graded === 'graded' || graded === 'ungraded') ? graded : null;
    
    const offset = (validPage - 1) * validPerPage;
      
      // Build where clause - EXCLUDE user's own cards (match original structure)
      let whereClause = 'WHERE tc.mark_as_deleted IS NULL AND c.sport_status = 1 AND tc.is_demo=0 AND tc.is_traded!=1';
      
      // EXCLUDE user's own cards if logged in, otherwise show all active cards
      if (validLoggedInUserId) {
        whereClause += ` AND tc.trader_id != ${validLoggedInUserId} AND tc.trading_card_status = '1'`;
      } else {
        whereClause += ` AND tc.trading_card_status = '1'`;
      }
      
    if (validCategoryId) {
      whereClause += ` AND tc.category_id = ${validCategoryId}`;
    }
    
    if (validGraded) {
      if (validGraded === 'graded') {
        whereClause += ` AND tc.graded = '1'`;
      } else if (validGraded === 'ungraded') {
        whereClause += ` AND (tc.graded = '0' OR tc.graded IS NULL)`;
      }
    }
    
      // Debug: Log the where clause

      // Use raw SQL to get data with sport_name and interested_in status (match original structure)
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
          tc.trading_card_estimated_value,
          tc.search_param,
          tc.title,
          c.sport_name,
          c.sport_icon,
          tc.trader_id,
          u.username as trader_name,
          tc.creator_id,
          tc.is_traded,
          tc.can_trade,
          tc.can_buy,
          tc.trading_card_status,
          tc.graded,
          CASE WHEN ii.id IS NOT NULL THEN true ELSE false END as interested_in,
          CASE 
            WHEN tc.trading_card_status = '1' AND tc.is_traded = '1' THEN 'Trade Pending'
            WHEN (tc.trading_card_status = '1' AND tc.is_traded = '0') OR tc.is_traded IS NULL THEN 'Available'
            WHEN tc.can_trade = '0' AND tc.can_buy = '0' THEN 'Not Available'
            WHEN tc.is_traded = '0' THEN 'Offer Accepted'
            WHEN tc.trading_card_status = '0' OR tc.trading_card_status IS NULL THEN 'Not Available'
            ELSE 'Not Available'
          END as trade_card_status,
          CASE 
            WHEN tc.card_condition_id IS NOT NULL THEN cc.card_condition_name
            WHEN tc.video_game_condition IS NOT NULL THEN tc.video_game_condition
            WHEN tc.console_condition IS NOT NULL THEN tc.console_condition
            WHEN tc.gum_condition IS NOT NULL THEN tc.gum_condition
            ELSE NULL
          END as card_condition
        FROM trading_cards tc
        LEFT JOIN categories c ON tc.category_id = c.id
        LEFT JOIN users u ON tc.trader_id = u.id
        LEFT JOIN card_conditions cc ON tc.card_condition_id = cc.id
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


      const countResult = await sequelize.query(countQuery, {
        type: QueryTypes.SELECT,
      }) as any[];

      const totalCount = countResult[0]?.total || 0;
      const totalPages = Math.ceil(totalCount / validPerPage);
      

      const tradingCards = await sequelize.query(rawQuery, {
        type: QueryTypes.SELECT,
      });


      return {
        success: true,
        data: tradingCards as any[],
        count: totalCount
      };
    } catch (error: any) {
      console.error('Get all trading cards except own error:', error);
      return { success: false, error: 'Failed to fetch trading cards' };
    }
  }

  // Get all TradingCard with pagination and category_name
    // Get user's own products (for myproduct source) - only check if not deleted
  async getUserOwnProducts(page: number = 1, perPage: number = 10, categoryId?: number, loggedInUserId?: number) {
    try {
      // Validate and sanitize input parameters
      const validPage = isNaN(page) || page < 1 ? 1 : page;
      const validPerPage = isNaN(perPage) || perPage < 1 ? 10 : perPage;
      const validCategoryId = categoryId && !isNaN(categoryId) && categoryId > 0 ? categoryId : null;
      const validLoggedInUserId = loggedInUserId && !isNaN(loggedInUserId) && loggedInUserId > 0 ? loggedInUserId : null;
      
      const offset = (validPage - 1) * validPerPage;
      
      // Simple where clause - only check if not deleted and belongs to user
      let whereClause = `WHERE tc.mark_as_deleted IS NULL AND tc.trader_id = ${validLoggedInUserId}`;
      
      if (validCategoryId) {
        whereClause += ` AND tc.category_id = ${validCategoryId}`;
      }
      
      // Use the same detailed query structure as getAllTradingCardsExceptOwn
      const interestedJoin = `LEFT JOIN interested_in ii ON tc.id = ii.trading_card_id AND ii.user_id = ${validLoggedInUserId}`;
      
      const rawQuery = `
        SELECT 
          tc.id,
          tc.category_id,
          tc.trading_card_img,
          tc.trading_card_img_back,
          tc.trading_card_slug,
          tc.trading_card_recent_trade_value,
          tc.trading_card_asking_price,
          tc.trading_card_estimated_value,
          tc.search_param,
          tc.title,
          c.sport_name,
          c.sport_icon,
          tc.trader_id,
          u.username as trader_name,
          tc.creator_id,
          tc.is_traded,
          tc.can_trade,
          tc.can_buy,
          tc.trading_card_status,
          tc.graded,
          CASE WHEN ii.id IS NOT NULL THEN true ELSE false END as interested_in,
          CASE 
            WHEN tc.trading_card_status = '1' AND tc.is_traded = '1' THEN 'Trade Pending'
            WHEN (tc.trading_card_status = '1' AND tc.is_traded = '0') OR tc.is_traded IS NULL THEN 'Available'
            WHEN tc.can_trade = '0' AND tc.can_buy = '0' THEN 'Not Available'
            WHEN tc.is_traded = '0' THEN 'Offer Accepted'
            WHEN tc.trading_card_status = '0' OR tc.trading_card_status IS NULL THEN 'Not Available'
            ELSE 'Not Available'
          END as trade_card_status,
          CASE 
            WHEN tc.card_condition_id IS NOT NULL THEN cc.card_condition_name
            WHEN tc.video_game_condition IS NOT NULL THEN tc.video_game_condition
            WHEN tc.console_condition IS NOT NULL THEN tc.console_condition
            WHEN tc.gum_condition IS NOT NULL THEN tc.gum_condition
            ELSE NULL
          END as card_condition
        FROM trading_cards tc
        LEFT JOIN categories c ON tc.category_id = c.id
        LEFT JOIN users u ON tc.trader_id = u.id
        LEFT JOIN card_conditions cc ON tc.card_condition_id = cc.id
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
      
      const [tradingCards, countResult] = await Promise.all([
        sequelize.query(rawQuery, { type: QueryTypes.SELECT }),
        sequelize.query(countQuery, { type: QueryTypes.SELECT })
      ]);
      
      const totalCount = (countResult[0] as any).total;
      const totalPages = Math.ceil(totalCount / validPerPage);
      
      return {
        success: true,
        data: tradingCards as any[],
        count: totalCount
      };
    } catch (error) {
      console.error('Error in getUserOwnProducts:', error);
      throw error;
    }
  }

    async getAllTradingCards(page: number = 1, perPage: number = 10, categoryId?: number, loggedInUserId?: number, graded?: string) {
    // Validate and sanitize input parameters
    const validPage = isNaN(page) || page < 1 ? 1 : page;
    const validPerPage = isNaN(perPage) || perPage < 1 ? 10 : perPage;
    const validCategoryId = categoryId && !isNaN(categoryId) && categoryId > 0 ? categoryId : null;
    const validLoggedInUserId = loggedInUserId && !isNaN(loggedInUserId) && loggedInUserId > 0 ? loggedInUserId : null;
    const validGraded = graded && (graded === 'graded' || graded === 'ungraded') ? graded : null;
    
    const offset = (validPage - 1) * validPerPage;
    
    // Build where clause based on whether it's user's own cards or not
    let whereClause = 'WHERE tc.mark_as_deleted IS NULL AND c.sport_status = 1 AND tc.is_demo=0 AND tc.is_traded!=1';
    
    // If it's user's own cards, show both active and inactive
    if (validLoggedInUserId) {
      whereClause += ` AND tc.trader_id = ${validLoggedInUserId} AND (tc.trading_card_status = '1' OR tc.trading_card_status = '0')`;
    } else {
      // For other users' cards, only show active ones
      whereClause += ` AND tc.trading_card_status = '1'`;
    }
    
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
        tc.trading_card_estimated_value,
        tc.search_param,
        tc.title,
        c.sport_name,
        c.sport_icon,
        tc.trader_id,
        u.username as trader_name,
        tc.creator_id,
        tc.is_traded,
        tc.can_trade,
        tc.can_buy,
        tc.trading_card_status,
        CASE WHEN ii.id IS NOT NULL THEN true ELSE false END as interested_in,
        CASE 
          WHEN tc.trading_card_status = '1' AND tc.is_traded = '1' THEN 'Trade Pending'
          WHEN (tc.trading_card_status = '1' AND tc.is_traded = '0') OR tc.is_traded IS NULL THEN 'Available'
          WHEN tc.can_trade = '0' AND tc.can_buy = '0' THEN 'Not Available'
          WHEN tc.is_traded = '0' THEN 'Offer Accepted'
          WHEN tc.trading_card_status = '0' OR tc.trading_card_status IS NULL THEN 'Not Available'
          ELSE 'Not Available'
        END as trade_card_status,
        CASE 
          WHEN tc.card_condition_id IS NOT NULL THEN cc.card_condition_name
          WHEN tc.video_game_condition IS NOT NULL THEN tc.video_game_condition
          WHEN tc.console_condition IS NOT NULL THEN tc.console_condition
          WHEN tc.gum_condition IS NOT NULL THEN tc.gum_condition
          ELSE NULL
        END as card_condition
      FROM trading_cards tc
      LEFT JOIN categories c ON tc.category_id = c.id
      LEFT JOIN users u ON tc.trader_id = u.id
      LEFT JOIN card_conditions cc ON tc.card_condition_id = cc.id
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

  // Get deleted trading cards for a specific user
  async getDeletedTradingCards(userId: number, page: number = 1, perPage: number = 10, categoryId?: number) {
    // Validate and sanitize input parameters
    const validPage = isNaN(page) || page < 1 ? 1 : page;
    const validPerPage = isNaN(perPage) || perPage < 1 ? 10 : perPage;
    const validCategoryId = categoryId && !isNaN(categoryId) && categoryId > 0 ? categoryId : null;
    
    
    if (!userId || isNaN(userId) || userId <= 0) {
      throw new Error("Valid user ID is required");
    }
    
    const offset = (validPage - 1) * validPerPage;
    
    // Base where clause for deleted cards
    let whereClause = 'WHERE tc.mark_as_deleted = 1 AND c.sport_status = 1 AND tc.is_demo=0';
    
    // Filter by user (trader_id)
    whereClause += ` AND tc.trader_id = ${userId}`;
    
    if (validCategoryId) {
      whereClause += ` AND tc.category_id = ${validCategoryId}`;
    }

    // Use raw SQL to get deleted trading cards
    const rawQuery = `
      SELECT 
        tc.id,
        tc.category_id,
        tc.trading_card_img,
        tc.trading_card_img_back,
        tc.trading_card_slug,
        tc.trading_card_recent_trade_value,
        tc.trading_card_asking_price,
        tc.trading_card_estimated_value,
        tc.search_param,
        tc.title,
        c.sport_name,
        c.sport_icon,
        tc.trader_id,
        tc.creator_id,
        tc.is_traded,
        tc.can_trade,
        tc.can_buy,
        tc.trading_card_status,
        tc.mark_as_deleted,
        tc.created_at,
        tc.updated_at,
        CASE 
          WHEN tc.trading_card_status = '1' AND tc.is_traded = '1' THEN 'Trade Pending'
          WHEN (tc.trading_card_status = '1' AND tc.is_traded = '0') OR tc.is_traded IS NULL THEN 'Available'
          WHEN tc.can_trade = '0' AND tc.can_buy = '0' THEN 'Not Available'
          WHEN tc.is_traded = '0' THEN 'Offer Accepted'
          WHEN tc.trading_card_status = '0' OR tc.trading_card_status IS NULL THEN 'Not Available'
          ELSE 'Not Available'
        END as trade_card_status
      FROM trading_cards tc
      LEFT JOIN categories c ON tc.category_id = c.id
      ${whereClause}
      ORDER BY tc.updated_at DESC
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
      message: "Deleted trading cards fetched successfully",
      data: results as any[],
      count: (countResults[0] as any)?.total ?? 0
    };
  }
  async getTradingCardById(id: number, loggedInUserId?: number) {
    // Validate the id parameter
    if (!id || isNaN(id) || id <= 0) {
      return null;
    }
    
    // Get the trading card with ALL data (no attributes restriction)
    const tradingCard = await TradingCard.findByPk(id, {
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

    // Add main trading card images to the images array first
    if (tradingCard.trading_card_img) {
      cardImages.images.push(tradingCard.trading_card_img);
    }
    if (tradingCard.trading_card_img_back) {
      cardImages.images.push(tradingCard.trading_card_img_back);
    }

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
                           'trading_card_recent_sell_link', 'trading_card_recent_trade_value', 'trader'];
      
      for (const fieldName of allFieldNames) {
        if (!basicFields.includes(fieldName) && 
            cardData[fieldName] !== null && 
            cardData[fieldName] !== undefined && 
            cardData[fieldName] !== '' &&
            cardData[fieldName] !== 0 && cardData[fieldName] !== '0') {
          
                     // Get field label and type from item_columns table
           const fieldInfo = await this.getFieldInfo(fieldName);
           const fieldLabel = fieldInfo.label;
           const fieldType = fieldInfo.type;
           
           // Check if this field has a relationship (ends with _id) or known FK fields
           if (fieldName.endsWith('_id') || fieldName === 'release_year' || fieldName === 'publication_year' || fieldName === 'vehicle_year') {
              
              let relatedTableName: string;
              
              if (fieldName === 'card_condition_id') {
                relatedTableName = 'condition';
              } else if (fieldName === 'release_year') {
                // Use years table for release_year lookups
                relatedTableName = 'years';
              } else if (fieldName === 'publication_year') {
                relatedTableName = 'publication_years';
              } else if (fieldName === 'vehicle_year') {
                relatedTableName = 'vehicle_years';
              } else {
                relatedTableName = fieldName.replace('_id', '');
              }
              
              let relatedValue = await this.getRelatedValue(relatedTableName, cardData[fieldName]);

              // Fallback: if release_year not found in years (legacy data), try release_years
              if (fieldName === 'release_year' && (relatedValue === null || relatedValue === undefined)) {
                const fallbackValue = await this.getRelatedValue('release_years', cardData[fieldName]);
                if (fallbackValue !== null && fallbackValue !== undefined) {
                  relatedValue = fallbackValue;
                }
              }

              // Ensure publication_year maps to publication_years
              if (fieldName === 'publication_year' && relatedTableName !== 'publication_years') {
                const pubValue = await this.getRelatedValue('publication_years', cardData[fieldName]);
                if (pubValue !== null && pubValue !== undefined) {
                  relatedValue = pubValue;
                }
              }
              
              additionalFields.push({
                field_name: fieldName,
                field_value: cardData[fieldName],
                field_label: fieldLabel,
                related_field_name: relatedTableName,
                related_field_value: relatedValue
              });
              
              // Only add _text field if the field type is "autocomplete"
              // Special-cases: ensure release_year, publication_year, vehicle_year always expose _text when related value exists
              if ((fieldType === 'autocomplete' || fieldName === 'release_year' || fieldName === 'publication_year' || fieldName === 'vehicle_year') && relatedValue !== null && relatedValue !== undefined) {
                additionalFields.push({
                  field_name: `${fieldName}_text`,
                  field_value: relatedValue,
                  field_label: `${fieldLabel || fieldName}_text`
                });
                // Also inject directly to main data copy to guarantee presence
                try {
                  (cardData as any)[`${fieldName}_text`] = relatedValue;
                } catch {}
              } else {
               
              }
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
    // If can_buy and can_trade are both 0 (as number) or '0' (as string), user can't trade or make offers
    // But if is_traded is falsy (0 or '0'), user can trade or make offers
    if(loggedInUserId && tradingCard.trader_id === loggedInUserId){
      canTradeOrOffer = false;
    }else if(tradingCard && (tradingCard.is_traded == '0') ) {
      canTradeOrOffer = true;
    }

    // Check if user is interested in this trading card
    let interested_in = false;
    if (loggedInUserId) {
      const interestedRecord = await InterestedIn.findOne({
        where: {
          tradingCardId: id,
          userId: loggedInUserId
        }
      });
      interested_in = !!interestedRecord;
    }

    // Create a copy of tradingCard data and add _text fields for autocomplete fields
    const cardData = { ...tradingCard.toJSON() };
    
    // Add _text fields for autocomplete fields directly to the main object
    for (const field of additionalFields) {
      if (field.field_name.endsWith('_text') && field.field_value) {
        (cardData as any)[field.field_name] = field.field_value;
      }
    }

    // Final guard: ensure vehicle_year_text and publication_year_text are present when FKs exist
    try {
      if ((cardData as any).vehicle_year && !(cardData as any).vehicle_year_text) {
        const vehText = await this.getRelatedValue('vehicle_years', (cardData as any).vehicle_year);
        if (vehText) {
          (cardData as any).vehicle_year_text = vehText;
        }
      }
    } catch {}
    try {
      if ((cardData as any).publication_year && !(cardData as any).publication_year_text) {
        const pubText = await this.getRelatedValue('publication_years', (cardData as any).publication_year);
        if (pubText) {
          (cardData as any).publication_year_text = pubText;
        }
      }
    } catch {}

    return {
      ...cardData,
      additionalFields: additionalFields,
      cardImages: cardImages,
      canTradeOrOffer: canTradeOrOffer,
      interested_in: interested_in
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

  // Helper method to get field label and type from item_columns table
  private async getFieldInfo(fieldName: string): Promise<{label: string | null, type: string | null}> {
    try {
      const query = `
        SELECT label, type
        FROM item_columns
        WHERE name = :fieldName
        LIMIT 1
      `;

      const result = await sequelize.query(query, {
        replacements: { fieldName },
        type: QueryTypes.SELECT
      });

      if (result.length > 0 && result[0]) {
        return {
          label: (result[0] as any).label || null,
          type: (result[0] as any).type || null
        };
      }
      return { label: null, type: null };
    } catch (error) {
      console.error(`Error getting field info for ${fieldName}:`, error);
      return { label: null, type: null };
    }
  }

  // Helper method to get related value from other tables
  private async getRelatedValue(tableName: string, id: number): Promise<any> {
    try {
      // Define common table relationships and their display fields
      const tableConfigs: { [key: string]: { table: string; displayField: string | string[]; idField?: string } } = {
        'player': { table: 'players', displayField: 'player_name', idField: 'id' },
        'team': { table: 'teams', displayField: 'team_name', idField: 'id' },
        'brand': { table: 'brands', displayField: 'brand_name', idField: 'id' },
        'year': { table: 'years', displayField: 'name', idField: 'id' },
        // Map release_year aliases to years
        'release_year': { table: 'years', displayField: 'name', idField: 'id' },
        'release_years': { table: 'years', displayField: 'name', idField: 'id' },
        // publication_year maps to publication_years (try multiple potential columns just in case)
        'publication_year': { table: 'publication_years', displayField: ['name'], idField: 'id' },
        'publication_years': { table: 'publication_years', displayField: ['name'], idField: 'id' },
        // vehicle_year maps to vehicle_years, try multiple potential column names
        'vehicle_year': { table: 'vehicle_years', displayField: ['name', 'vehicle_year', 'year'], idField: 'id' },
        // also accept key 'vehicle_years' from callers
        'vehicle_years': { table: 'vehicle_years', displayField: ['name', 'vehicle_year', 'year'], idField: 'id' },
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

      const displayFields = Array.isArray(config.displayField) ? config.displayField : [config.displayField];
      for (const df of displayFields) {
        try {
      const query = `
            SELECT ${df} as display_value
        FROM ${config.table}
        WHERE ${config.idField || 'id'} = :id
        LIMIT 1
      `;
      const result = await sequelize.query(query, {
        replacements: { id },
        type: QueryTypes.SELECT
      });
          const val = result.length > 0 && result[0] ? (result[0] as any).display_value : null;
          if (val !== null && val !== undefined && String(val).trim() !== '') {
            return val;
          }
        } catch {}
      }
      return null;
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
      return false;
    }
    
    const tradingCard = await TradingCard.findByPk(id);
    if (!tradingCard) {
      return false;
    }
    // Set mark_as_deleted = true instead of actually deleting
    await tradingCard.update({ mark_as_deleted: 1 });
    return {
      status: true,
      message: "Trading card marked as deleted successfully.",
      data: []
    };
  }

   // Get TradingCards by Category ID with pagination
  async getTradingCardsByCategoryId(categorySlug: string, loggedInUserId?: number, page: number = 1, perPage: number = 10) {
    const category = await Category.findOne({ where: { slug: categorySlug, sport_status: '1' } });
    if (!category) {
      return {
        success: false,
        error: {
          message: 'Category not found'
        }
      };
    }

    const offset = (page - 1) * perPage;
    const limit = perPage;

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

    // Get total count
    const totalCount = await TradingCard.count({
      where: {
        category_id: category.id,
        ...(loggedInUserId ? { trader_id: { [Op.ne]: loggedInUserId } } : {})
      },
      include: [
        { model: User, attributes: ['id'], where: { user_status: '1' }, required: true }
      ]
    });

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
      order: [['is_demo', 'ASC']],
      limit: limit,
      offset: offset
    });

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / perPage);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return {
      success: true,
      data: {
        cards: tradingCards,
        pagination: {
          currentPage: page,
          perPage: perPage,
          totalCount: totalCount,
          totalPages: totalPages,
          hasNextPage: hasNextPage,
          hasPrevPage: hasPrevPage
        }
      }
    };
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
    categoryId?: number,
    graded?: string
  ) {
    // Validate and sanitize input parameters
    const validUserId = userId && !isNaN(userId) && userId > 0 ? userId : null;
    const validPage = isNaN(page) || page < 1 ? 1 : page;
    const validPerPage = isNaN(perPage) || perPage < 1 ? 10 : perPage;
    const validLoggedInUserId = loggedInUserId && !isNaN(loggedInUserId) && loggedInUserId > 0 ? loggedInUserId : null;
    const validGraded = graded && (graded === 'graded' || graded === 'ungraded') ? graded : null;
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
        tc.trading_card_estimated_value,
        tc.search_param,
        tc.title,
        c.sport_name,
        c.sport_icon,
        tc.trader_id,
        tc.creator_id,
        tc.is_traded,
        tc.can_trade,
        tc.can_buy,
        CASE WHEN ii.id IS NOT NULL THEN true ELSE false END as interested_in,
        CASE 
          WHEN tc.card_condition_id IS NOT NULL THEN cc.card_condition_name
          WHEN tc.video_game_condition IS NOT NULL THEN tc.video_game_condition
          WHEN tc.console_condition IS NOT NULL THEN tc.console_condition
          WHEN tc.gum_condition IS NOT NULL THEN tc.gum_condition
          ELSE NULL
        END as card_condition,
        CASE 
          WHEN tc.trading_card_status = '1' AND tc.is_traded = '1' THEN 'Trade Pending'
          WHEN (tc.trading_card_status = '1' AND tc.is_traded = '0') OR tc.is_traded IS NULL THEN 'Available'
          WHEN tc.can_trade = '0' AND tc.can_buy = '0' THEN 'Not Available'
          WHEN tc.is_traded = '0' THEN 'Offer Accepted'
          WHEN tc.trading_card_status = '0' OR tc.trading_card_status IS NULL THEN 'Not Available'
          ELSE 'Not Available'
        END as trade_card_status
      FROM trading_cards tc
      LEFT JOIN categories c ON tc.category_id = c.id
      LEFT JOIN card_conditions cc ON tc.card_condition_id = cc.id
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
      attributes: ["id", [Sequelize.col("sport_name"), "label"], "slug", "sport_icon"]
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
      attributes: ["id", [Sequelize.col("sport_name"), "label"], "slug", "sport_icon"],
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
      if (itemColumn) {
      }
      
      if (itemColumn && itemColumn.rel_master_table) {
        if (itemColumn.is_js_load === 1) {
          categoryJSFieldCollection.push(itemColumn.name || '');
        } else if (itemColumn.is_ajax_load === 0) {
          // Get master data for non-ajax fields
          // Special handling for grade_ratings and professional_graders - use dynamic category ID
          let masterData;
          // Tables that need special category filtering
          const specialTables = [
            'grade_ratings', 'professional_graders', 'packages', 'publishers',
            'brands', 'Brand', 'certifications', 'circulateds', 'coin_names', 'countries', 'Country',
            'denominations', 'coin_stamp_grade_ratings', 'mint_marks', 'item_types', 'ItemType', 'ItemTypes',
            'sports', 'Sports', 'console_models', 'ConsoleModel', 'consolemodels',
            'region_codes', 'RegionCode', 'regioncodes', 'storage_capacities', 'StorageCapacity', 'storagecapacities',
            'platform_consoles', 'PlatformConsole', 'platformconsoles', 'record_grade_ratings', 'RecordGradeRating', 'recordgraderatings',
            'record_graders', 'RecordGrader', 'recordgraders', 'record_sizes', 'RecordSize', 'recordsizes',
            'sleeve_grade_ratings', 'SleeveGradeRating', 'sleevegraderatings', 'sleeve_graders', 'SleeveGrader', 'sleevegraders',
            'types', 'Type', 'Types', 'publication_years', 'PublicationYear'
          ];
          
          if (specialTables.includes(itemColumn.rel_master_table)) {
            // For these tables, use the dynamic categoryId from the form field
            masterData = await HelperService.getMasterDatas(
              itemColumn.rel_master_table, 
              categoryId // Use the dynamic category ID from the form field
            );
          } else {
            masterData = await HelperService.getMasterDatas(
            itemColumn.rel_master_table, 
            categoryId
          );
          }
          categoryFieldCollection[itemColumn.rel_master_table] = masterData;
        } else if (itemColumn.is_ajax_load === 1) {
          categoryAjaxFieldCollection.push(itemColumn.name || '');
        }
        
        // Handle select fields - populate is_loop with table data for all select type fields
        if (itemColumn && itemColumn.type === 'select' && itemColumn.rel_master_table) {
          
          try {
            // Special handling for grade_ratings and professional_graders - use dynamic category ID
            let loopData;
            // Tables that need special category filtering
            const specialTables = [
              'grade_ratings', 'professional_graders', 'packages', 'publishers', 'Publisher',
              'brands', 'Brand', 'certifications', 'circulateds', 'coin_names', 'countries', 'Country',
              'denominations', 'coin_stamp_grade_ratings', 'mint_marks', 'item_types', 'ItemType', 'ItemTypes',
              'sports', 'Sports', 'console_models', 'ConsoleModel', 'consolemodels',
              'region_codes', 'RegionCode', 'regioncodes', 'storage_capacities', 'StorageCapacity', 'storagecapacities',
              'platform_consoles', 'PlatformConsole', 'platformconsoles', 'record_grade_ratings', 'RecordGradeRating', 'recordgraderatings',
              'record_graders', 'RecordGrader', 'recordgraders', 'record_sizes', 'RecordSize', 'recordsizes',
              'sleeve_grade_ratings', 'SleeveGradeRating', 'sleevegraderatings', 'sleeve_graders', 'SleeveGrader', 'sleevegraders',
              'types', 'Type', 'Types', 'publication_years', 'PublicationYear'
            ];
            
            if (specialTables.includes(itemColumn.rel_master_table)) {
              // For these tables, use the dynamic categoryId from the form field
              loopData = await HelperService.getMasterDatas(
                itemColumn.rel_master_table, 
                categoryId // Use the dynamic category ID from the form field
              );
            } else {
              loopData = await HelperService.getMasterDatas(
              itemColumn.rel_master_table, 
              categoryId
            );
            }
            
            
            if (loopData && loopData.length > 0) {
              // Transform data to include id, label, value and the master column (e.g., name)
              const selectOptions = loopData.map((item: any) => {
                const label = item[itemColumn.rel_model_col] || item.label || item.name || `Option ${item.id}`;
                const option: any = {
                  id: item.id,
                  label: label,
                  value: item.id
                };
                const relTable = (itemColumn.rel_master_table || '').toLowerCase();
                if (itemColumn.rel_model_col && (relTable === 'country' || relTable === 'countries')) {
                  option[itemColumn.rel_model_col] = item[itemColumn.rel_model_col] ?? label;
                }
                return option;
              });
              
              
              // Store the select options in the field collection
              categoryFieldCollection[`${itemColumn.name}_options`] = selectOptions;
              
              // Add to JS field collection so frontend knows this field has loop data
              categoryJSFieldCollection.push(itemColumn.name || '');
              
              // Update the itemColumn to include is_loop data
              itemColumn.is_loop = selectOptions;
              
            } else {
              itemColumn.is_loop = [];
            }
          } catch (error) {
            console.error(`Error getting loop data for field ${itemColumn.name}:`, error);
          }
        } else {
          if (itemColumn) {
          }
        }
      }
      
      // Debug: Log the final itemColumn state
      if (itemColumn && itemColumn.type === 'select') {
      }
      
      return {
        fields: field.fields,
        is_required: field.is_required,
        additional_information: field.additional_information,
        priority: field.priority,
        item_column: itemColumn
      };
    }));

    // Debug: Log the final response structure
    transformedCategoryFields.forEach((field: any) => {
      if (field.item_column && field.item_column.type === 'select') {
      }
    });

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
  async getAllCardConditions(page: number = 1, perPage: number = 10) {
    try {
      const offset = (page - 1) * perPage;
      const limit = perPage;

      // Get total count
      const totalCount = await CardCondition.count({
        where: { card_condition_status: '1' }
      });

      const cardConditions = await CardCondition.findAll({
        where: { card_condition_status: '1' },
        order: [['card_condition_name', 'ASC']],
        attributes: ['id', 'card_condition_name', 'card_condition_status', 'created_at', 'updated_at'],
        limit: limit,
        offset: offset
      });

      // Calculate pagination metadata
      const totalPages = Math.ceil(totalCount / perPage);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      return {
        success: true,
        data: {
          cardConditions,
          pagination: {
            currentPage: page,
            perPage: perPage,
            totalCount: totalCount,
            totalPages: totalPages,
            hasNextPage: hasNextPage,
            hasPrevPage: hasPrevPage
          }
        }
      };
    } catch (error) {
      console.error('Error getting card conditions:', error);
      return {
        success: false,
        error: {
          message: (error as Error).message || 'Failed to get card conditions'
        }
      };
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
      // Base save data - exactly like Laravel
      const saveData: any = {
        creator_id: userId,
        trader_id: userId,
        category_id: categoryId,
      };

      // Get category fields with priority - exactly like Laravel
      const categoryFields = await CategoryField.findAll({
        where: { category_id: categoryId },
        order: [['priority', 'ASC']],
        attributes: ['fields', 'is_required', 'additional_information', 'mark_as_title'],
        include: [{
          model: (await import('../models/index.js')).ItemColumn,
          as: 'item_column'
        }]
      });

      // Process category fields - exactly like Laravel
      const productAttributes: any = {};
      const markAsTitleArr: any = {};
      const markAsTitleColsArr: string[] = [];
      
      // Category fields loaded; suppress verbose debug logging in production

      for (const cField of categoryFields) {
        const fieldName = cField.fields;
        
        // Add field to saveData if present in request - exactly like Laravel
        if (fieldName && requestData[fieldName] !== undefined) {
          saveData[fieldName] = requestData[fieldName];
        }

        // Handle mark as title logic - exactly like Laravel
        if (fieldName && cField.mark_as_title === true) {
          // Field flagged as mark_as_title
          
          if (cField.mark_as_title === true) {
            markAsTitleColsArr.push(fieldName);
            // Track mark_as_title columns
            
            // Initialize markAsTitleArr object for this field
            markAsTitleArr[fieldName] = {};
            
            // Get the field value from request - exactly like Laravel
            if (typeof requestData[fieldName] === 'string' && requestData[fieldName].trim()) {
              markAsTitleArr[fieldName].value = requestData[fieldName];
              // Added to markAsTitleArr
            }

            // Get item column data for prefix and type - exactly like Laravel
            if (cField.item_column) {
              if (cField.item_column.prefix) {
                markAsTitleArr[fieldName].prefix = cField.item_column.prefix;
              }

                // Handle select/autocomplete fields - exactly like Laravel
                if (cField.item_column.type === 'select' || cField.item_column.type === 'autocomplete') {
                  const textFieldName = `${fieldName}_text`;
                  if (typeof requestData[textFieldName] === 'string' && requestData[textFieldName].trim()) {
                    markAsTitleArr[fieldName].value = requestData[textFieldName];
                  } else {
                    markAsTitleArr[fieldName].rel_model_fun = cField.item_column.rel_model_fun;
                    markAsTitleArr[fieldName].rel_model_col = cField.item_column.rel_model_col;
                  }
                }
              }
            }
        }

        // Handle select/autocomplete fields with master data - exactly like Laravel
        if (fieldName && cField.item_column) {
          if (cField.item_column.type === 'select') {
            const textFieldName = `${fieldName}_text`;
            if (typeof requestData[textFieldName] === 'string' && requestData[textFieldName].trim()) {
              const masterId = await HelperService.saveMasterByMeta(
                requestData[textFieldName],
                cField.item_column.rel_master_table,
                cField.item_column.rel_model_col,
                cField.item_column.rel_model_index,
                categoryId
              );
              
              if (masterId > 0) {
                const relIndex = cField.item_column?.rel_model_index as string | undefined;
                const targetCol = (relIndex && /_id$/i.test(relIndex)) ? relIndex : (cField.item_column?.name || fieldName);
                saveData[targetCol] = masterId;
              }
            }

            // Fallback: when client sent plain text in main field (create-or-get master)
            if (
              typeof requestData[fieldName] === 'string' &&
              requestData[fieldName].trim() &&
              isNaN(Number(requestData[fieldName]))
            ) {
              const masterId = await HelperService.saveMasterByMeta(
                requestData[fieldName].trim(),
                cField.item_column.rel_master_table,
                cField.item_column.rel_model_col,
                cField.item_column.rel_model_index,
                categoryId
              );
              if (masterId > 0) {
                const relIndex = cField.item_column?.rel_model_index as string | undefined;
                const targetCol = (relIndex && /_id$/i.test(relIndex)) ? relIndex : (cField.item_column?.name || fieldName);
                saveData[targetCol] = masterId;
              }
            }
          }

          if (cField.item_column.type === 'autocomplete') {
            const textFieldName = `${fieldName}_text`;
            if (typeof requestData[textFieldName] === 'string' && requestData[textFieldName].trim()) {
              const masterId = await HelperService.saveMasterByMeta(
                requestData[textFieldName],
                cField.item_column.rel_master_table,
                cField.item_column.rel_model_col,
                cField.item_column.rel_model_index,
                categoryId
              );
              
              if (masterId > 0) {
                const relIndex = cField.item_column?.rel_model_index as string | undefined;
                const targetCol = (relIndex && /_id$/i.test(relIndex)) ? relIndex : (cField.item_column?.name || fieldName);
                saveData[targetCol] = masterId;
              }
            }

            // Fallback: when client sent plain text in main field (create-or-get master)
            if (
              typeof requestData[fieldName] === 'string' &&
              requestData[fieldName].trim() &&
              isNaN(Number(requestData[fieldName]))
            ) {
              const masterId = await HelperService.saveMasterByMeta(
                requestData[fieldName].trim(),
                cField.item_column.rel_master_table,
                cField.item_column.rel_model_col,
                cField.item_column.rel_model_index,
                categoryId
              );
              if (masterId > 0) {
                const relIndex = cField.item_column?.rel_model_index as string | undefined;
                const targetCol = (relIndex && /_id$/i.test(relIndex)) ? relIndex : (cField.item_column?.name || fieldName);
                saveData[targetCol] = masterId;
              }
            }
          }

          // Type-agnostic fallback: if item column maps to a master table and the main field contains non-numeric text,
          // create-or-get master and set its id.
          if (
            typeof requestData[fieldName] === 'string' &&
            requestData[fieldName].trim() &&
            isNaN(Number(requestData[fieldName]))
          ) {
            try {
              const itemMetaRows = await HelperService.getMasterDatas('item_columns', categoryId);
              const itemMeta = Array.isArray(itemMetaRows)
                ? itemMetaRows.find((row: any) => row && row.name === fieldName)
                : null;
              if (itemMeta && (itemMeta.rel_master_table || itemMeta.rel_model_fun)) {
                const masterId = await HelperService.saveMasterByMeta(
                  requestData[fieldName].trim(),
                  itemMeta.rel_master_table,
                  itemMeta.rel_model_col,
                  itemMeta.rel_model_index,
                  categoryId
                );
                if (masterId > 0) {
                  const relIndexMeta = (itemMeta && itemMeta.rel_model_index) as string | undefined;
                  const relIndex = cField.item_column?.rel_model_index as string | undefined;
                  const targetCol = (relIndexMeta && /_id$/i.test(relIndexMeta))
                    ? relIndexMeta
                    : ((relIndex && /_id$/i.test(relIndex)) ? relIndex : (cField.item_column?.name || fieldName));
                  saveData[targetCol] = masterId;
                }
              }
            } catch {}
          }
        }
      }

      // Ensure core master FK fields are captured even if not present in category fields
      if (requestData.release_year !== undefined && requestData.release_year !== null) {
        saveData.release_year = requestData.release_year;
      }

      // Create trading card first - exactly like Laravel
      const tradingCard = await TradingCard.create(saveData);

      if (!tradingCard.id) {
        throw new Error("Failed to create TradingCard record");
      }

      // Generate code - exactly like Laravel
      const code = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14) + tradingCard.id;

      // Handle ProductAttribute creation - exactly like Laravel
      if (Object.keys(productAttributes).length > 0) {
        const ProductAttribute = (await import('../models/productAttribute.model.js')).ProductAttribute;
        const createData: any = {
          product_id: tradingCard.id,
          collection: JSON.stringify(productAttributes)
        };
        await ProductAttribute.create(createData);
      }

      // Generate search parameters and slug - exactly like Laravel
      let searchParam = '';
      let tradingCardSlug = '';
      
      // Suppress verbose debug logging

      if (Object.keys(markAsTitleArr).length > 0) {
        const paramAndSlug = await this.createProductSearchParametersAndSlug(
          markAsTitleArr, 
          tradingCard.id, 
          markAsTitleColsArr
        );
        searchParam = paramAndSlug.search_param;
        tradingCardSlug = paramAndSlug.trading_card_slug;
        // search_param and trading_card_slug generated
      } else {
        // No mark as title fields found
      }

      // Handle image fields - exactly like Laravel
      let tradingCardImg = '';
      let tradingCardImgBack = '';

      if (requestData.trading_card_img) {
        tradingCardImg = requestData.trading_card_img;
      }
      if (requestData.trading_card_img_back) {
        tradingCardImgBack = requestData.trading_card_img_back;
      }

      // Update trading card with final data - exactly like Laravel
      await TradingCard.update({
        code: code,
        search_param: searchParam,
        trading_card_slug: tradingCardSlug,
        trading_card_img: tradingCardImg,
        trading_card_img_back: tradingCardImgBack
      }, {
        where: { id: tradingCard.id }
      });

      // Handle additional images - exactly like Laravel
      if (requestData.additional_images && Array.isArray(requestData.additional_images) && requestData.additional_images.length > 0) {
        // Filter out any blank/empty paths to avoid empty DB columns
        const cleaned = requestData.additional_images
          .map((p: any) => (typeof p === 'string' ? p.trim() : ''))
          .filter((p: string) => !!p);
        
        if (cleaned.length > 0) {
        const { CardImage } = await import('../models/index.js');
        
        const cardImageData: any = {
          // Use model attribute names (sequelize maps to snake_case columns)
          mainCardId: tradingCard.id,
          traderId: userId,
          cardImageStatus: '1'
        };

        // Map additional images to card_image_1, card_image_2, etc. - exactly like Laravel
        cleaned.forEach((imagePath: string, index: number) => {
          if (index < 4) { // Only support up to 4 additional images
            const key = `cardImage${index + 1}`; // maps to card_image_1..4
            cardImageData[key] = imagePath;
          }
        });

        await CardImage.create(cardImageData);
        }
      }

      // Update user trading card count - exactly like Laravel
      await this.getUserTradingCardCount(userId);

      // Handle ex_product_id - exactly like Laravel
      if (requestData.ex_product_id && requestData.ex_product_id > 0) {
        await TradingCard.update({
          can_trade: '0',
          can_buy: '0',
          trading_card_status: '0'
        }, {
          where: {
            id: requestData.ex_product_id,
            is_demo: 1
          }
        });
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
   * Create product search parameters and slug (equivalent to Laravel ____createProductSearchParametersAndSlug)
   */
  async createProductSearchParametersAndSlug(
    markAsTitleArr: any,
    cardId: number,
    markAsTitleColsArr: string[]
  ): Promise<{ search_param: string; trading_card_slug: string }> {
    try {
      // Add 'id' to markAsTitleColsArr - exactly like Laravel
      markAsTitleColsArr.push('id');
      
      // Get trading card data with specified columns - exactly like Laravel
      const tradingCard = await TradingCard.findByPk(cardId, {
        attributes: markAsTitleColsArr
      });

      if (!tradingCard) {
        return { search_param: '', trading_card_slug: '' };
      }

      const searchParamArr: string[] = [];
      const titleArr: string[] = [];

      if (Object.keys(markAsTitleArr).length > 0) {
        for (const [key, value] of Object.entries(markAsTitleArr)) {
          let title = '';
          
          // Handle relationship model - exactly like Laravel
          if ((value as any).rel_model_fun && (value as any).rel_model_fun.trim()) {
            const relFun = (value as any).rel_model_fun;
            const relCol = (value as any).rel_model_col;
            
            // Load relationship and get value - exactly like Laravel
            // Note: This would need proper relationship loading in Sequelize
            // For now, we'll use the direct value
            title = (tradingCard as any)[key] || '';
          } else {
            // Use direct value - exactly like Laravel
            if ((value as any).value && (value as any).value.trim()) {
              title = (value as any).value;
            } else {
              title = (tradingCard as any)[key] || '';
            }
          }

          title = String(title || '').trim();

          // Add prefix - exactly like Laravel
          if ((value as any).prefix && (value as any).prefix.trim()) {
            title = (value as any).prefix + title;
          }

          // Process search parameter - exactly like Laravel
          let searchParamText = title;
          let text = searchParamText.replace(/\./g, '');
          text = text.replace(/\//g, '-');
          text = text.replace(/\[/g, '');
          text = text.replace(/\]/g, '');
          text = text.replace(/\{/g, '');
          text = text.replace(/\}/g, '');
          
          if (text.trim()) {
            searchParamArr.push(text);
          }

          // Process slug - exactly like Laravel
          text = title.replace(/[^a-zA-Z0-9_ -]/g, '');
          text = text.replace(/\s+/g, '-');
          text = text.replace(/\./g, '');
          text = text.replace(/\[/g, '');
          text = text.replace(/\]/g, '');
          text = text.replace(/\{/g, '');
          text = text.replace(/\}/g, '');
          
          if (text.trim()) {
            titleArr.push(text);
          }
        }
      }

      const tradingCardSlug = titleArr.length > 0 ? titleArr.join('-') : '';
      const searchParamTitle = searchParamArr.length > 0 ? searchParamArr.join(' ') : '';

      return {
        search_param: searchParamTitle,
        trading_card_slug: tradingCardSlug.toLowerCase()
      };

    } catch (error: any) {
      console.error('Error creating search parameters and slug:', error);
      return { search_param: '', trading_card_slug: '' };
    }
  }

  /**
   * Get user trading card count (equivalent to Laravel getUserTradingCardCount)
   */
  async getUserTradingCardCount(traderId: number): Promise<number> {
    try {
      const { User } = await import('../models/index.js');
      
      const totalTradingCards = await TradingCard.count({
        where: { creator_id: traderId }
      });

      // Update user's trading_cards count - exactly like Laravel
      await User.update(
        { trading_cards: totalTradingCards },
        { where: { id: traderId } }
      );

      return totalTradingCards;

    } catch (error: any) {
      console.error('Error getting user trading card count:', error);
      return 0;
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

      // Generate trading_card_slug and search_param from series_set, issue_number, story_title, variant
      const slugParts: string[] = [];
      const searchParts: string[] = [];
      
      // Add series_set
      if (typeof requestData.series_set === 'string' && requestData.series_set.trim()) {
        const seriesSet = requestData.series_set.trim();
        slugParts.push(seriesSet.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-'));
        searchParts.push(seriesSet);
      }
      
      // Add issue_number
      if (typeof requestData.issue_number === 'string' && requestData.issue_number.trim()) {
        const issueNumber = requestData.issue_number.trim();
        slugParts.push(issueNumber);
        searchParts.push(`#${issueNumber}`);
      }
      
      // Add story_title
      if (typeof requestData.story_title === 'string' && requestData.story_title.trim()) {
        const storyTitle = requestData.story_title.trim();
        slugParts.push(storyTitle.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-'));
        searchParts.push(storyTitle);
      }
      
      // Add variant
      if (typeof requestData.variant === 'string' && requestData.variant.trim()) {
        const variant = requestData.variant.trim();
        slugParts.push(variant.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-'));
        searchParts.push(variant);
      }
      
      // Generate final strings
      if (slugParts.length > 0) {
        saveData.trading_card_slug = slugParts.join('-');
        saveData.search_param = searchParts.join(' ');
      }

      // Ensure core master FK fields on update
      if (requestData.release_year !== undefined && requestData.release_year !== null) {
        saveData.release_year = requestData.release_year;
        
      }

      // Get category fields with priority
      const categoryFields = await CategoryField.findAll({
        where: { category_id: categoryId },
        order: [['priority', 'ASC']],
        attributes: ['fields', 'is_required', 'additional_information', 'mark_as_title']
      });

      // Validate required fields - COMMENTED OUT FOR EDIT API
      // const missingRequiredFields: string[] = [];
      // for (const cField of categoryFields) {
      //   if (cField.is_required && cField.fields) {
      //     const fieldValue = requestData[cField.fields];
      //     if (!fieldValue || (typeof fieldValue === 'string' && !fieldValue.trim())) {
      //       missingRequiredFields.push(cField.fields);
      //     }
      //   }
      // }

      // if (missingRequiredFields.length > 0) {
      //   return { 
      //     success: false, 
      //     error: `Required fields are missing: ${missingRequiredFields.join(', ')}` 
      //   };
      // }

      // Process category fields
      const productAttributes: any = {};
      const markAsTitleArr: any = {};
      const markAsTitleColsArr: string[] = [];


      for (const cField of categoryFields) {
        const fieldName = cField.fields;
        
        if (fieldName && requestData[fieldName] !== undefined) {
          // Handle all field types - assign the value directly like in save method
          // BUT: Don't override release_year if it was already set correctly by the controller
          if (fieldName === 'release_year' && saveData.release_year !== undefined) {
            
          } else {
          saveData[fieldName] = requestData[fieldName];
            
            // Debug for release_year field
            if (fieldName === 'release_year') {
              
            }
          }
          
          // Special debug for set_name
          if (fieldName === 'set_name') {
          }
        } else if (fieldName === 'set_name') {
        }
        // Don't set default values for fields not provided - this is PATCH behavior

        // Handle mark as title logic
        if (cField.mark_as_title === true && fieldName) {
          markAsTitleColsArr.push(fieldName);
          
          if (typeof requestData[fieldName] === 'string' && requestData[fieldName].trim()) {
            markAsTitleArr[fieldName] = {
              value: requestData[fieldName]
            };
          }

          // Handle select/autocomplete fields for title
          const textFieldName = `${fieldName}_text`;
          if (typeof requestData[textFieldName] === 'string' && requestData[textFieldName].trim()) {
            markAsTitleArr[fieldName] = {
              value: requestData[textFieldName]
            };
          }
        }

        // Handle select/autocomplete fields with master data
        if (fieldName) {
          const textFieldName = `${fieldName}_text`;
          if (typeof requestData[textFieldName] === 'string' && requestData[textFieldName].trim()) {
            // Unconditionally attempt to upsert/find in master using item_columns mapping
              const masterId = await HelperService.saveMasterDataAndReturnMasterId(
              String(requestData[textFieldName]).trim(),
                fieldName,
                categoryId
              );
              if (masterId > 0) {
                saveData[fieldName] = masterId;
            }
          }
        }
      }

      // Handle file uploads - only update if valid files are provided (not null/empty)
      if (requestData.trading_card_img !== undefined && 
          requestData.trading_card_img !== null && 
          String(requestData.trading_card_img).trim() !== '') {
        saveData.trading_card_img = requestData.trading_card_img;
      }
      if (requestData.trading_card_img_back !== undefined && 
          requestData.trading_card_img_back !== null && 
          String(requestData.trading_card_img_back).trim() !== '') {
        saveData.trading_card_img_back = requestData.trading_card_img_back;
      }

      // Check if we have any data to update
      if (Object.keys(saveData).length === 0) {
        return { success: false, error: "No data provided for update" };
      }

      // Debug: Log what we're about to save

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
      }

      // Handle additional images - always process if provided, or preserve existing if not provided
      let finalImages: string[] = [];
      
      // Get existing images from database
      
      
      // First, let's check if we can access the CardImage model
      try {
        const testQuery = await CardImage.findAll({ limit: 1 });
        
      } catch (modelError) {
        console.error(`[DEBUG SERVICE] Error accessing CardImage model:`, modelError);
      }
      
      const existingCardImage = await CardImage.findOne({ where: { mainCardId: cardId } });
      
      const existingImages: string[] = [];
      
      if (existingCardImage) {
        if (existingCardImage.cardImage1) existingImages.push(existingCardImage.cardImage1);
        if (existingCardImage.cardImage2) existingImages.push(existingCardImage.cardImage2);
        if (existingCardImage.cardImage3) existingImages.push(existingCardImage.cardImage3);
        if (existingCardImage.cardImage4) existingImages.push(existingCardImage.cardImage4);
      }
      
      
      // If new additional_images are provided, use them (replace existing)
      if (requestData.additional_images && Array.isArray(requestData.additional_images) && requestData.additional_images.length > 0) {
        // Filter out any empty/null image paths
        const validImages = requestData.additional_images
          .filter((imagePath: any) => 
            imagePath && 
            typeof imagePath === 'string' && 
            imagePath.trim() !== ''
          );
        
        // Check if more than 4 images are provided
        if (validImages.length > 4) {
          return { success: false, error: `Maximum 4 additional images allowed. You provided ${validImages.length} images.` };
        }
        
        finalImages = validImages;
      } else {
        // If no new images provided, preserve existing images
        finalImages = existingImages;
      }
      
      // Update card images in database
      if (finalImages.length > 0) {
        // Delete existing card images for this trading card
        try {
          const deletedCount = await CardImage.destroy({ where: { mainCardId: cardId } });
        } catch (deleteError) {
          throw deleteError;
        }
        
        // Create new card image record with all images in one record
        const cardImageData: any = {
          mainCardId: cardId,
          traderId: userId
        };
        
        // Set the appropriate card image fields (card_image_1, card_image_2, etc.)
        if (finalImages[0]) cardImageData.cardImage1 = finalImages[0];
        if (finalImages[1]) cardImageData.cardImage2 = finalImages[1];
        if (finalImages[2]) cardImageData.cardImage3 = finalImages[2];
        if (finalImages[3]) cardImageData.cardImage4 = finalImages[3];
        
        try {
          const createdCardImage = await CardImage.create(cardImageData);          
          // Verify the record was actually saved by querying it back
          const verifyCardImage = await CardImage.findOne({ where: { mainCardId: cardId } });

        } catch (createError) {
          throw createError;
        }
      } else if (existingCardImage) {
        // If no images at all, delete existing record
        try {
          const deletedCount = await CardImage.destroy({ where: { mainCardId: cardId } });
        } catch (deleteError) {
          throw deleteError;
        }
      }

      // MAIN UPDATE OPERATION - This was missing!
      await TradingCard.update(saveData, { where: { id: cardId } });

      // Verify what was actually saved
      const verifyCard = await TradingCard.findByPk(cardId);

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
   * Update trading card status (on/off switch)
   * Equivalent to Laravel status toggle functionality
   */
  async updateTradingCardStatus(
    cardId: number,
    statusId: number,
    userId: number
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // Validate inputs
      if (!cardId || isNaN(cardId) || cardId <= 0) {
        return { success: false, error: "Invalid card ID" };
      }

      if (statusId !== 0 && statusId !== 1) {
        return { success: false, error: "Status ID must be 0 (inactive) or 1 (active)" };
      }

      // Find the trading card
      const tradingCard = await TradingCard.findByPk(cardId, {
        attributes: ['id', 'trader_id', 'trading_card_status', 'trading_card_slug']
      });

      if (!tradingCard) {
        return { success: false, error: "Trading card not found" };
      }

      // Check if user owns this trading card
      if (tradingCard.trader_id !== userId) {
        return { success: false, error: "You don't have permission to update this trading card" };
      }

      // Update the trading card status
      await TradingCard.update(
        { trading_card_status: statusId.toString() },
        { where: { id: cardId } }
      );

      // Get updated trading card with only required fields
      const updatedCard = await TradingCard.findByPk(cardId, {
        attributes: ['id', 'trading_card_status']
      });

      return {
        success: true,
        data: {
          id: updatedCard?.id,
          trading_card_status: updatedCard?.trading_card_status
        }
      };

    } catch (error: any) {
      console.error('Error updating trading card status:', error);
      return {
        success: false,
        error: error.message || 'Unknown error occurred'
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
   * Get popular trading cards based on interested_in count and is_traded = 0 with pagination
   */
  static async getPopularTradingCards(page: number = 1, perPage: number = 10) {
    try {
      const offset = (page - 1) * perPage;
      const limit = perPage;

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM trading_cards tc
        LEFT JOIN categories c ON tc.category_id = c.id
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
      `;

      const countResult = await sequelize.query(countQuery, {
        type: QueryTypes.SELECT
      });
      const totalCount = (countResult[0] as any).total;

      // Get popular cards with pagination
      const query = `
        SELECT
          tc.id,
          tc.trading_card_img,
          tc.trading_card_img_back,
          tc.trading_card_slug,
          tc.trading_card_recent_trade_value,
          tc.trading_card_asking_price,
          tc.trading_card_estimated_value,
          tc.search_param,
          tc.title,
          tc.can_trade,
          tc.can_buy,
          tc.is_traded,
          tc.trader_id,
          u.username as trader_name,
          c.sport_name,
          title,
        c.sport_icon,
          CASE 
            WHEN tc.card_condition_id IS NOT NULL THEN cc.card_condition_name
            WHEN tc.video_game_condition IS NOT NULL THEN tc.video_game_condition
            WHEN tc.console_condition IS NOT NULL THEN tc.console_condition
            WHEN tc.gum_condition IS NOT NULL THEN tc.gum_condition
            ELSE NULL
          END as card_condition,
          CASE 
            WHEN tc.trading_card_status = '1' AND tc.is_traded = '1' THEN 'Trade Pending'
            WHEN (tc.trading_card_status = '1' AND tc.is_traded = '0') OR tc.is_traded IS NULL THEN 'Available'
            WHEN tc.can_trade = '0' AND tc.can_buy = '0' THEN 'Not Available'
            WHEN tc.is_traded = '0' THEN 'Offer Accepted'
            WHEN tc.trading_card_status = '0' OR tc.trading_card_status IS NULL THEN 'Not Available'
            ELSE 'Not Available'
          END as trade_card_status
        FROM trading_cards tc
        LEFT JOIN categories c ON tc.category_id = c.id
        LEFT JOIN users u ON tc.trader_id = u.id
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
        LIMIT :limit OFFSET :offset
      `;

      const result = await sequelize.query(query, {
        replacements: { limit, offset },
        type: QueryTypes.SELECT
      });

      // Calculate pagination metadata
      const totalPages = Math.ceil(totalCount / perPage);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      return {
        success: true,
        data: {
          cards: result,
          pagination: {
            currentPage: page,
            perPage: perPage,
            totalCount: totalCount,
            totalPages: totalPages,
            hasNextPage: hasNextPage,
            hasPrevPage: hasPrevPage
          }
        }
      };
    } catch (error) {
      console.error('Error getting popular trading cards:', error);
      return {
        success: false,
        error: {
          message: (error as Error).message || 'Failed to get popular trading cards'
        }
      };
    }
  }

  /**
   * Main search API - supports both image upload and text search with pagination
   */
  static async mainSearch(searchText: string, page: number = 1, perPage: number = 10) {
    try {
      const offset = (page - 1) * perPage;
      const limit = perPage;

      // Split search text into individual words and create LIKE conditions for each word
      const searchWords = searchText.trim().split(/\s+/).filter(word => word.length > 0);
      const likeConditions = searchWords.map((_, index) => `tc.search_param LIKE :searchWord${index}`).join(' OR ');
      const searchReplacements: any = {};
      searchWords.forEach((word, index) => {
        searchReplacements[`searchWord${index}`] = `%${word}%`;
      });

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM trading_cards tc
        LEFT JOIN categories c ON tc.category_id = c.id
        WHERE tc.trading_card_status = '1'
        AND tc.mark_as_deleted IS NULL
        AND tc.is_traded = '0'
        AND tc.is_demo = '0'
        AND c.sport_status = '1'
        AND (tc.can_trade = 1 OR tc.can_buy = 1)
        AND (${likeConditions})
      `;

      const countResult = await sequelize.query(countQuery, {
        replacements: searchReplacements,
        type: QueryTypes.SELECT
      });
      const totalCount = (countResult[0] as any).total;

      // Get search results with pagination
      const query = `
        SELECT
          tc.id,
          tc.trading_card_img,
          tc.trading_card_img_back,
          tc.trading_card_slug,
          tc.trading_card_recent_trade_value,
          tc.trading_card_asking_price,
          tc.trading_card_estimated_value,
          tc.search_param,
          tc.title,
          tc.is_traded,
          tc.trader_id,
          u.username as trader_name,
          c.sport_name,
          tc.can_trade,
          tc.can_buy,
        c.sport_icon,
          CASE 
            WHEN tc.card_condition_id IS NOT NULL THEN cc.card_condition_name
            WHEN tc.video_game_condition IS NOT NULL THEN tc.video_game_condition
            WHEN tc.console_condition IS NOT NULL THEN tc.console_condition
            WHEN tc.gum_condition IS NOT NULL THEN tc.gum_condition
            ELSE NULL
          END as card_condition,
          CASE 
            WHEN tc.trading_card_status = '1' AND tc.is_traded = '1' THEN 'Trade Pending'
            WHEN (tc.trading_card_status = '1' AND tc.is_traded = '0') OR tc.is_traded IS NULL THEN 'Available'
            WHEN tc.can_trade = '0' AND tc.can_buy = '0' THEN 'Not Available'
            WHEN tc.is_traded = '0' THEN 'Offer Accepted'
            WHEN tc.trading_card_status = '0' OR tc.trading_card_status IS NULL THEN 'Not Available'
            ELSE 'Not Available'
          END as trade_card_status
        FROM trading_cards tc
        LEFT JOIN categories c ON tc.category_id = c.id
        LEFT JOIN users u ON tc.trader_id = u.id
        LEFT JOIN card_conditions cc ON tc.card_condition_id = cc.id
        WHERE tc.trading_card_status = '1'
        AND tc.mark_as_deleted IS NULL
        AND tc.is_traded = '0'
        AND tc.is_demo = '0'
        AND c.sport_status = '1'
        AND (tc.can_trade = 1 OR tc.can_buy = 1)
        AND (${likeConditions})
        ORDER BY tc.created_at DESC
        LIMIT :limit OFFSET :offset
      `;

      const result = await sequelize.query(query, {
        replacements: { 
          ...searchReplacements,
          limit,
          offset
        },
        type: QueryTypes.SELECT
      });

      // Calculate pagination metadata
      const totalPages = Math.ceil(totalCount / perPage);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      return {
        success: true,
        data: {
          cards: result,
          pagination: {
            currentPage: page,
            perPage: perPage,
            totalCount: totalCount,
            totalPages: totalPages,
            hasNextPage: hasNextPage,
            hasPrevPage: hasPrevPage
          }
        }
      };
    } catch (error) {
      console.error('Error in main search:', error);
      return {
        success: false,
        error: {
          message: (error as Error).message || 'Failed to perform search'
        }
      };
    }
  }

  // Get similar trading cards based on categories with pagination
  static async getSimilarTradingCards(categoryIds: number[], page: number = 1, perPage: number = 10, loggedInUserId?: number, excludeTradingCardId?: number) {
    try {
      if (!categoryIds || categoryIds.length === 0) {
        return {
          success: true,
          data: {
            cards: [],
            pagination: {
              currentPage: page,
              perPage: perPage,
              totalCount: 0,
              totalPages: 0,
              hasNextPage: false,
              hasPrevPage: false
            }
          }
        };
      }

      const offset = (page - 1) * perPage;
      const limit = perPage;

      // Add interested_in join if loggedInUserId is provided
      let interestedJoin = '';
      if (loggedInUserId) {
        interestedJoin = `LEFT JOIN interested_in ii ON tc.id = ii.trading_card_id AND ii.user_id = ${loggedInUserId}`;
      }

      // Add exclusion condition if tradingCardId is provided
      let excludeCondition = '';
      if (excludeTradingCardId) {
        excludeCondition = `AND tc.id != ${excludeTradingCardId}`;
      }

      // Get total count
      const countQuery = `
        SELECT COUNT(DISTINCT tc.id) as total
        FROM trading_cards tc
        LEFT JOIN categories c ON tc.category_id = c.id
        ${interestedJoin}
        WHERE tc.category_id IN (:categoryIds)
        AND tc.mark_as_deleted IS NULL
        AND tc.trading_card_status = '1'
        AND c.sport_status = '1'
        AND tc.is_demo = '0'
        AND tc.is_traded != '1'
        ${excludeCondition}
      `;

      const countResult = await sequelize.query(countQuery, {
        replacements: { categoryIds },
        type: QueryTypes.SELECT
      });
      const totalCount = (countResult[0] as any).total;

      // Build the SELECT clause based on whether loggedInUserId is provided
      let selectClause = `
        SELECT DISTINCT
          tc.id,
          tc.category_id,
          tc.trading_card_img,
          tc.trading_card_img_back,
          tc.trading_card_slug,
          tc.trading_card_recent_trade_value,
          tc.trading_card_asking_price,
          tc.trading_card_estimated_value,
          tc.search_param,
          tc.title,
          c.sport_name,
        c.sport_icon,
          tc.trader_id,
          tc.creator_id,
          tc.created_at,
          tc.is_traded,
          tc.can_trade,
          tc.can_buy,
          CASE 
            WHEN tc.card_condition_id IS NOT NULL THEN cc.card_condition_name
            WHEN tc.video_game_condition IS NOT NULL THEN tc.video_game_condition
            WHEN tc.console_condition IS NOT NULL THEN tc.console_condition
            WHEN tc.gum_condition IS NOT NULL THEN tc.gum_condition
            ELSE NULL
          END as card_condition,
          CASE 
            WHEN tc.trading_card_status = '1' AND tc.is_traded = '1' THEN 'Trade Pending'
            WHEN (tc.trading_card_status = '1' AND tc.is_traded = '0') OR tc.is_traded IS NULL THEN 'Available'
            WHEN tc.can_trade = '0' AND tc.can_buy = '0' THEN 'Not Available'
            WHEN tc.is_traded = '0' THEN 'Offer Accepted'
            WHEN tc.trading_card_status = '0' OR tc.trading_card_status IS NULL THEN 'Not Available'
            ELSE 'Not Available'
          END as trade_card_status
      `;

      if (loggedInUserId) {
        selectClause += `,
          CASE WHEN ii.id IS NOT NULL THEN true ELSE false END as interested_in
        `;
      }

      const query = `
        ${selectClause}
        FROM trading_cards tc
        LEFT JOIN categories c ON tc.category_id = c.id
        LEFT JOIN card_conditions cc ON tc.card_condition_id = cc.id
        ${interestedJoin}
        WHERE tc.category_id IN (:categoryIds)
        AND tc.mark_as_deleted IS NULL
        AND tc.trading_card_status = '1'
        AND c.sport_status = '1'
        AND tc.is_demo = '0'
        AND tc.is_traded != '1'
        ${excludeCondition}
        ORDER BY tc.created_at DESC
        LIMIT :limit OFFSET :offset
      `;     

      const result = await sequelize.query(query, {
        replacements: { categoryIds, limit, offset },
        type: QueryTypes.SELECT
      });

      // Calculate pagination metadata
      const totalPages = Math.ceil(totalCount / perPage);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      return {
        success: true,
        data: {
          cards: result,
          pagination: {
            currentPage: page,
            perPage: perPage,
            totalCount: totalCount,
            totalPages: totalPages,
            hasNextPage: hasNextPage,
            hasPrevPage: hasPrevPage
          }
        }
      };
    } catch (error) {
      console.error('Error getting similar trading cards:', error);
      return {
        success: false,
        error: {
          message: (error as Error).message || 'Failed to get similar trading cards'
        }
      };
    }
  }
}
