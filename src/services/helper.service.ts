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
}
