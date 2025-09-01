import { sequelize } from "../config/db.js";
import { QueryTypes } from "sequelize";

export class HelperService {
  /**
   * Get master data from a specified table
   * This is equivalent to the Laravel Helper::____getMasterDatas method
   */
  static async getMasterDatas(tableName: string, categoryId?: number): Promise<any[]> {
    try {
      let query = `SELECT * FROM ${tableName}`;
      const replacements: any = {};
      
      // If category_id is provided and the table has a category_id column, filter by it
      if (categoryId) {
        // Check if the table has a category_id column
        const tableInfo = await sequelize.query(`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_NAME = :tableName 
          AND COLUMN_NAME = 'category_id'
        `, {
          replacements: { tableName },
          type: QueryTypes.SELECT
        });
        
        if (tableInfo.length > 0) {
          query += ` WHERE category_id = :categoryId`;
          replacements.categoryId = categoryId;
        }
      }
      
      query += ` ORDER BY id ASC`;
      
      const result = await sequelize.query(query, {
        replacements,
        type: QueryTypes.SELECT
      });
      
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
      // Get item column data
      const itemColumnData = await sequelize.query(
        `SELECT rel_master_table, rel_model_col, rel_model_index 
         FROM item_columns 
         WHERE name = :field`,
        {
          replacements: { field },
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

      // Get without category masters (hardcoded for now, you can make this configurable)
      const withoutCategoryMasters = [
        'manufacturers',
        'brands',
        'countries',
        'states',
        'cities'
      ];

      // Check if record already exists
      const existingRecord = await sequelize.query(
        `SELECT id, category_id FROM ${rel_master_table} WHERE ${rel_model_col} = :value`,
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
                `UPDATE ${rel_master_table} SET category_id = :categoryIds WHERE id = :id`,
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
        `INSERT INTO ${rel_master_table} (${columns}) VALUES (${values})`,
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
