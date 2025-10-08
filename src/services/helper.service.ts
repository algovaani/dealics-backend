import { sequelize } from "../config/db.js";
import { QueryTypes } from "sequelize";

export class HelperService {
  /**
   * Map table names from item_columns to actual database table names
   */
  private static mapTableName(tableName: string): string {
    const tableNameMapping: { [key: string]: string } = {
      // Lowercase variations
      'graderatings': 'grade_ratings',
      'grade_ratings': 'grade_ratings',
      'cardconditions': 'card_conditions',
      'card_conditions': 'card_conditions',
      'professionalgraders': 'professional_graders',
      'professional_graders': 'professional_graders',
      'conventionevent': 'convention_events',
      'convention_events': 'convention_events',
      'manufacturers': 'manufacturers',
      'brands': 'brands',
      'countries': 'countries',
      'country': 'countries',
      'states': 'states',
      'cities': 'cities',
      'item_columns': 'item_columns',
      'categories': 'categories',
      'trading_cards': 'trading_cards',
      'users': 'users',
      'speed': 'speeds',
      'speeds': 'speeds',
      'package': 'packages',
      'packages': 'packages',
      'publisher': 'publishers',
      'publishers': 'publishers',
      'brand': 'brands',
      'certifications': 'certifications',
      'circulateds': 'circulateds',
      'coin_names': 'coin_names',
      'denominations': 'denominations',
      'coin_stamp_grade_ratings': 'coin_stamp_grade_ratings',
      'mint_marks': 'mint_marks',
      'item_types': 'item_types',
      'ItemType': 'item_types',
      'ItemTypes': 'item_types',
      'sports': 'sports',
      'Sports': 'sports',
      'console_models': 'console_models',
      'ConsoleModel': 'console_models',
      'consolemodels': 'console_models',
      'region_codes': 'region_codes',
      'RegionCode': 'region_codes',
      'regioncodes': 'region_codes',
      'storage_capacities': 'storage_capacities',
      'StorageCapacity': 'storage_capacities',
      'storagecapacities': 'storage_capacities',
      'platform_consoles': 'platform_consoles',
      'PlatformConsole': 'platform_consoles',
      'platformconsoles': 'platform_consoles',
      'record_grade_ratings': 'record_grade_ratings',
      'RecordGradeRating': 'record_grade_ratings',
      'recordgraderatings': 'record_grade_ratings',
      'record_graders': 'record_graders',
      'RecordGrader': 'record_graders',
      'recordgraders': 'record_graders',
      'record_sizes': 'record_sizes',
      'RecordSize': 'record_sizes',
      'recordsizes': 'record_sizes',
      'sleeve_grade_ratings': 'sleeve_grade_ratings',
      'SleeveGradeRating': 'sleeve_grade_ratings',
      'sleevegraderatings': 'sleeve_grade_ratings',
      'sleeve_graders': 'sleeve_graders',
      'SleeveGrader': 'sleeve_graders',
      'sleevegraders': 'sleeve_graders',
      'types': 'types',
      'Type': 'types',
      'Types': 'types',
      // PascalCase variations (as stored in database)
      'GradeRatings': 'grade_ratings',
      'CardConditions': 'card_conditions',
      'ProfessionalGraders': 'professional_graders',
      'ConventionEvents': 'convention_events',
      'Manufacturers': 'manufacturers',
      'Brands': 'brands',
      'Countries': 'countries',
      'Country': 'countries',
      'States': 'states',
      'Cities': 'cities',
      'ItemColumns': 'item_columns',
      'Categories': 'categories',
      'TradingCards': 'trading_cards',
      'Users': 'users',
      'Speeds': 'speeds',
      'Packages': 'packages',
      'Publisher': 'publishers',
      'Publishers': 'publishers',
      'Brand': 'brands',
      'Certifications': 'certifications',
      'Certification': 'certifications',
      'Circulateds': 'circulateds',
      'Circulated': 'circulateds',
      'CoinNames': 'coin_names',
      'CoinName': 'coin_names',
      'Denominations': 'denominations',
      'Denomination': 'denominations',
      'CoinStampGradeRatings': 'coin_stamp_grade_ratings',
      'CoinStampGradeRating': 'coin_stamp_grade_ratings',
      'MintMarks': 'mint_marks',
      'MintMark': 'mint_marks',
      // Publication Year mappings
      'PublicationYear': 'publication_years',
      'PublicationYears': 'publication_years',
      'publicationyear': 'publication_years',
      'publicationyears': 'publication_years',
      'publication_year': 'publication_years',
      'publication_years': 'publication_years',
      // Exclusive Event Retailers mapping (handle different casings)
      'exclusive_event_retailers': 'exclusive_event_retailers',
      'ExclusiveEventRetailer': 'exclusive_event_retailers',
      'ExclusiveEventRetailers': 'exclusive_event_retailers',
      'exclusiveeventretailer': 'exclusive_event_retailers',
      'exclusiveeventretailers': 'exclusive_event_retailers'
    };
    
    const mappedName = tableNameMapping[tableName] || tableNameMapping[tableName.toLowerCase()] || tableName;
    return mappedName;
  }

  /**
   * Get master data from a specified table
   * This is equivalent to the Laravel Helper::____getMasterDatas method
   */
  static async getMasterDatas(tableName: string, categoryId?: number): Promise<any[]> {
    try {
      // Map the table name to the correct database table name
      const mappedTableName = this.mapTableName(tableName);
      let query = `SELECT * FROM ${mappedTableName}`;
      const replacements: any = {};
      
      // Tables that don't need category filtering (global master data)
      const globalTables = [
        'card_conditions', 
        'convention_events',
        'manufacturers',
        'states',
        'cities'
      ];
      
      // Special handling for tables with comma-separated category_id values
      const commaSeparatedTables = [
        'grade_ratings',
        'professional_graders', 
        'brands',
        'Brand',
        'certifications',
        'circulateds',
        'coin_names',
        'countries',
        'denominations',
        'coin_stamp_grade_ratings',
        'mint_marks',
        'item_types',
        'ItemType',
        'ItemTypes',
        'publishers',
        'Publisher',
        'sports',
        'Sports',
        'console_models',
        'ConsoleModel',
        'consolemodels',
        'region_codes',
        'RegionCode',
        'regioncodes',
        'storage_capacities',
        'StorageCapacity',
        'storagecapacities',
        'platform_consoles',
        'PlatformConsole',
        'platformconsoles',
        'record_grade_ratings',
        'RecordGradeRating',
        'recordgraderatings',
        'record_graders',
        'RecordGrader',
        'recordgraders',
        'record_sizes',
        'RecordSize',
        'recordsizes',
        'sleeve_grade_ratings',
        'SleeveGradeRating',
        'sleevegraderatings',
        'sleeve_graders',
        'SleeveGrader',
        'sleevegraders',
        'types',
        'Type',
        'Types',
        'publication_years',
        'PublicationYear'
      ];
      
      // Determine if table has a status column to filter active records
      let hasStatusColumn = false;
      try {
        const statusInfo = await sequelize.query(`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_NAME = :tableName 
          AND COLUMN_NAME = 'status'
        `, {
          replacements: { tableName: mappedTableName },
          type: QueryTypes.SELECT
        });
        hasStatusColumn = statusInfo.length > 0;
      } catch {}

      if (commaSeparatedTables.includes(mappedTableName) && categoryId) {
        // For these tables, filter by category_id using FIND_IN_SET for comma-separated values
        // The category_id column contains comma-separated values like "15,18,24,29"
        query += ` WHERE FIND_IN_SET(:categoryId, category_id)`;
        replacements.categoryId = String(categoryId);
        if (hasStatusColumn) {
          query += ` AND status IN ('1', 1)`;
        }
      }
      // If category_id is provided and the table is not a global table, filter by it
      else if (categoryId && !globalTables.includes(mappedTableName)) {
        // Check if the table has a category_id column
        const tableInfo = await sequelize.query(`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_NAME = :tableName 
          AND COLUMN_NAME = 'category_id'
        `, {
          replacements: { tableName: mappedTableName },
          type: QueryTypes.SELECT
        });
        
        if (tableInfo.length > 0) {
          query += ` WHERE category_id = :categoryId`;
          replacements.categoryId = categoryId;
          if (hasStatusColumn) {
            query += ` AND status IN ('1', 1)`;
          }
        } else if (hasStatusColumn) {
          // No category filter, but still filter by active status
          query += ` WHERE status IN ('1', 1)`;
        }
      } else if (hasStatusColumn) {
        // No category filtering applied; still filter active records if status exists
        query += ` WHERE status IN ('1', 1)`;
      }
      
      // Special handling for card_conditions: allow category filtering even though it's global
      if (mappedTableName === 'card_conditions' && categoryId) {
        // Check if the table has a category_id column
        const tableInfo = await sequelize.query(`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_NAME = :tableName 
          AND COLUMN_NAME = 'category_id'
        `, {
          replacements: { tableName: mappedTableName },
          type: QueryTypes.SELECT
        });
        
        if (tableInfo.length > 0) {
          // Add category filter for card_conditions
          if (query.includes('WHERE')) {
            query += ` AND category_id = :categoryId`;
          } else {
            query += ` WHERE category_id = :categoryId`;
          }
          replacements.categoryId = categoryId;
        }
      }
      
      query += ` ORDER BY id ASC`;
      
      let result = await sequelize.query(query, {
        replacements,
        type: QueryTypes.SELECT
      });
      
      // Fallback: if no rows for countries with category filter, return all active countries
      if (mappedTableName === 'countries' && categoryId && result.length === 0) {
        let fallbackQuery = `SELECT * FROM ${mappedTableName}`;
        // Apply active status filter if exists
        if (hasStatusColumn) {
          fallbackQuery += ` WHERE status IN ('1', 1)`;
        }
        fallbackQuery += ` ORDER BY id ASC`;
        result = await sequelize.query(fallbackQuery, {
          type: QueryTypes.SELECT
        });
      }

      // Fallback: if no rows for card_conditions with category filter, return all active card_conditions
      if (mappedTableName === 'card_conditions' && categoryId && result.length === 0) {
        let fallbackQuery = `SELECT * FROM ${mappedTableName}`;
        // card_conditions uses card_condition_status column
        try {
          const statusColInfo = await sequelize.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = :tableName 
            AND COLUMN_NAME = 'card_condition_status'
          `, {
            replacements: { tableName: mappedTableName },
            type: QueryTypes.SELECT
          });
          const hasCardConditionStatus = statusColInfo.length > 0;
          if (hasCardConditionStatus) {
            fallbackQuery += ` WHERE card_condition_status IN ('1', 1)`;
          } else if (hasStatusColumn) {
            fallbackQuery += ` WHERE status IN ('1', 1)`;
          }
        } catch {}
        fallbackQuery += ` ORDER BY id ASC`;
        result = await sequelize.query(fallbackQuery, {
          type: QueryTypes.SELECT
        });
      }

      
      return result;
    } catch (error) {
      console.error(`Error getting master data from ${tableName}:`, error);
      return [];
    }
  }

  /**
   * Saves master data and returns master ID (equivalent to Laravel ___saveMasterDataAndReturnMasterId)
   */
  static async saveMasterDataAndReturnMasterId(
    value: string,
    field: string,
    categoryId: number
  ): Promise<number> {
    try {
      // Build candidate field names to resolve item_columns row
      const candidates: string[] = Array.from(new Set([
        field,
        field.replace(/_text$/i, ''),
        field.replace(/_slt$/i, ''),
        field.replace(/_id$/i, ''),
        field.replace(/_name$/i, ''),
        field.replace(/(_text|_slt|_id|_name)$/ig, ''),
      ].filter(Boolean)));

      // Get item column data using any of the candidate names
      const itemColumnData = await sequelize.query(
        `SELECT name, rel_master_table, rel_model_col, rel_model_index 
         FROM item_columns 
         WHERE name IN (:names) 
         LIMIT 1`,
        {
          replacements: { names: candidates },
          type: QueryTypes.SELECT,
        }
      );

      if (!itemColumnData || itemColumnData.length === 0) {
        return 0;
      }

      const data = itemColumnData[0] as any;
      const { rel_master_table, rel_model_col, rel_model_index } = data;

      if (!rel_master_table || !rel_master_table.trim()) {
        return 0;
      }

      // Map the table name to the correct database table name
      const mappedTableName = this.mapTableName(rel_master_table);

      // Get without category masters (hardcoded for now, you can make this configurable)
      const withoutCategoryMasters = [
        'countries',
        'states',
        'cities'
      ];

      // Check if record already exists (case-insensitive match for text columns)
      const existingRecord = await sequelize.query(
        `SELECT id, category_id FROM ${mappedTableName} WHERE LOWER(${rel_model_col}) = LOWER(:value)`,
        {
          replacements: { value },
          type: QueryTypes.SELECT,
        }
      );

      if (existingRecord && existingRecord.length > 0) {
        const record = existingRecord[0] as any;
        
        if (record.id > 0) {
          // Update category_id if not in withoutCategoryMasters
          if (!withoutCategoryMasters.includes(rel_model_index)) {
            const existingCategoryIds = record.category_id 
              ? record.category_id.split(',').map((id: string) => id.trim()).filter(Boolean)
              : [];
            
            if (!existingCategoryIds.includes(categoryId.toString())) {
              existingCategoryIds.push(categoryId.toString());
              const updatedCategoryIds = [...new Set(existingCategoryIds)].join(',');
              
              await sequelize.query(
                `UPDATE ${mappedTableName} SET category_id = :categoryIds WHERE id = :id`,
                {
                  replacements: { categoryIds: updatedCategoryIds, id: record.id },
                  type: QueryTypes.UPDATE,
                }
              );
            }
          }
          
          return record.id;
        }
      }

      // Create new record
      let insertData: any = {
        [rel_model_col]: value,
        status: 1
      };

      if (!withoutCategoryMasters.includes(rel_model_index)) {
        insertData.category_id = categoryId;
      }

      const columns = Object.keys(insertData).join(', ');
      const values = Object.keys(insertData).map(key => `:${key}`).join(', ');
      
      const result = await sequelize.query(
        `INSERT INTO ${mappedTableName} (${columns}) VALUES (${values})`,
        {
          replacements: insertData,
          type: QueryTypes.INSERT,
        }
      );

      return result[0] as number;
    } catch (error) {
      console.error('Error in saveMasterDataAndReturnMasterId:', error);
      return 0;
    }
  }

  /**
   * Save master by explicit meta (bypasses item_columns lookup)
   */
  static async saveMasterByMeta(
    value: string,
    rel_master_table: string,
    rel_model_col: string,
    rel_model_index: string | null | undefined,
    categoryId: number
  ): Promise<number> {
    try {
      if (!rel_master_table || !rel_model_col) return 0;

      const mappedTableName = this.mapTableName(rel_master_table);

      const withoutCategoryMasters = [
        'countries',
        'states',
        'cities'
      ];

      const existingRecord = await sequelize.query(
        `SELECT id, category_id FROM ${mappedTableName} WHERE LOWER(${rel_model_col}) = LOWER(:value)`,
        { replacements: { value }, type: QueryTypes.SELECT }
      );

      if (existingRecord && existingRecord.length > 0) {
        const record = existingRecord[0] as any;
        if (record.id > 0) {
          if (rel_model_index && !withoutCategoryMasters.includes(rel_model_index)) {
            const existingCategoryIds = record.category_id
              ? String(record.category_id).split(',').map((id: string) => id.trim()).filter(Boolean)
              : [];
            if (!existingCategoryIds.includes(String(categoryId))) {
              existingCategoryIds.push(String(categoryId));
              const updatedCategoryIds = Array.from(new Set(existingCategoryIds)).join(',');
              await sequelize.query(
                `UPDATE ${mappedTableName} SET category_id = :categoryIds WHERE id = :id`,
                { replacements: { categoryIds: updatedCategoryIds, id: record.id }, type: QueryTypes.UPDATE }
              );
            }
          }
          return record.id as number;
        }
      }

      const insertData: any = { [rel_model_col]: value, status: 1 };
      if (rel_model_index && !withoutCategoryMasters.includes(rel_model_index)) {
        insertData.category_id = categoryId;
      }
      const columns = Object.keys(insertData).join(', ');
      const values = Object.keys(insertData).map((k) => `:${k}`).join(', ');
      const result = await sequelize.query(
        `INSERT INTO ${mappedTableName} (${columns}) VALUES (${values})`,
        { replacements: insertData, type: QueryTypes.INSERT }
      );
      return result[0] as number;
    } catch (error) {
      console.error('Error in saveMasterByMeta:', error);
      return 0;
    }
  }

  /**
   * Get master data without category (equivalent to Laravel withoutCategoryMasters)
   */
  static getWithoutCategoryMasters(): string[] {
    return [
      'manufacturers',
      'brands', 
      'countries',
      'states',
      'cities'
    ];
  }
}
