import { Sequelize } from 'sequelize-typescript';
import { User } from './user.model.js';
import { Category } from './category.model.js';
import { TradingCard } from './tradingcard.model.js';
import { CardCondition } from './cardCondition.model.js';
import { CardImage } from './card_image.model.js';
import { CategoryField } from './categoryField.model.js';

// Import all models here
export const models = [
  User,
  Category,
  TradingCard,
  CardCondition,
  CardImage,
  CategoryField
];

// Function to set up all associations
export function setupAssociations() {
  // User associations
  User.hasMany(TradingCard, {
    foreignKey: 'trader_id',
    as: 'tradingCards'
  });

  User.hasMany(TradingCard, {
    foreignKey: 'creator_id',
    as: 'createdCards'
  });

  // Category associations
  Category.hasMany(TradingCard, {
    foreignKey: 'category_id',
    as: 'categoryTradingCards'
  });

  // TradingCard associations
  TradingCard.belongsTo(User, {
    foreignKey: 'trader_id',
    as: 'trader'
  });

  TradingCard.belongsTo(User, {
    foreignKey: 'creator_id',
    as: 'creatorUser'
  });

  TradingCard.belongsTo(Category, {
    foreignKey: 'category_id',
    as: 'parentCategory'
  });

  TradingCard.belongsTo(CardCondition, {
    foreignKey: 'card_condition_id',
    as: 'cardCondition'
  });

  // CardCondition associations
  CardCondition.hasMany(TradingCard, {
    foreignKey: 'card_condition_id',
    as: 'conditionTradingCards'
  });

  // CardImage associations
  CardImage.belongsTo(TradingCard, {
    foreignKey: 'mainCardId',
    as: 'tradingCard'
  });

  TradingCard.hasMany(CardImage, {
    foreignKey: 'mainCardId',
    as: 'cardImages'
  });

  // CategoryField associations
  CategoryField.belongsTo(Category, {
    foreignKey: 'category_id',
    as: 'fieldCategory'
  });

  Category.hasMany(CategoryField, {
    foreignKey: 'category_id',
    as: 'categoryFields'
  });
}

// Export all models for easy importing
export {
  User,
  Category,
  TradingCard,
  CardCondition,
  CardImage,
  CategoryField
};
