import { Category } from "../models/index.js";

export class CategoryService {
  // Get all Category with pagination
  async getAllCategories(page: number = 1, perPage: number = 10) {
    const offset = (page - 1) * perPage;
    const limit = perPage;

    // Get total count
    const totalCount = await Category.count({
      where: {
        sport_status: '1'
      }
    });

    // Get categories with pagination
    const categories = await Category.findAll({
      where: {
        sport_status: '1'
      },
      order: [['sport_name', 'ASC']],
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
        categories,
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

  // Get Category by ID
  async getCategoryById(id: number) {
    return await Category.findByPk(id);
  }

  // Create new Category
  async createCategory(data: any) {
    return await Category.create(data);
  }

  // Update Category
  async updateCategory(id: number, data: any) {
    try {
      const category = await Category.findByPk(id);
      if (!category) return null;
  
      await category.update({
        sport_name: data.sport_name ?? category.sport_name,
        slug: data.slug ?? category.slug,
        sport_icon: data.sport_icon ?? category.sport_icon,
        sport_status: data.sport_status ?? category.sport_status,
        grades_ungraded_status: data.grades_ungraded_status ?? category.grades_ungraded_status,
        csv_cols: data.csv_cols ?? category.csv_cols,
        csv_fields: data.csv_fields ?? category.csv_fields
      });
  
      return category;
    } catch (err) {
      console.error("Error updating category:", err);
      throw err;
    }
  }

  // Delete Category
  async deleteCategory(id: number) {
    const category = await Category.findByPk(id);
    if (!category) return null;
    await category.destroy();
    return true;
  }
}
