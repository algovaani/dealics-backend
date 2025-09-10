import { Sequelize } from 'sequelize-typescript';
import { User } from './user.model.js';
import { Category } from './category.model.js';
import { TradingCard } from './tradingcard.model.js';
import { CardCondition } from './cardCondition.model.js';
import { CardImage } from './card_image.model.js';
import { CategoryField } from './categoryField.model.js';
import { Follower } from './follower.model.js';
import { CreditPurchaseLog } from './creditPurchaseLog.model.js';
import { CreditDeductionLog } from './creditDeductionLog.model.js';
import { InterestedIn } from './interestedIn.model.js';
import { UserSocialMedia } from './userSocialMedia.model.js';
import { SocialMedia } from './socialMedia.model.js';
import { Shipment } from './shipment.model.js';
import { Address } from './address.model.js';
import { CategoryShippingRate } from './categoryShippingRates.model.js';

// Import all models here
export const models = [
  User,
  Category,
  TradingCard,
  CardCondition,
  CardImage,
  CategoryField,
  Follower,
  CreditPurchaseLog,
  CreditDeductionLog,
  InterestedIn,
  UserSocialMedia,
  SocialMedia,
  Shipment,
  Address,
  CategoryShippingRate
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

  // UserSocialMedia associations
  UserSocialMedia.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user'
  });

  UserSocialMedia.belongsTo(SocialMedia, {
    foreignKey: 'social_media_id',
    as: 'SocialMedia'
  });

  // SocialMedia associations
  SocialMedia.hasMany(UserSocialMedia, {
    foreignKey: 'social_media_id',
    as: 'socialMediaUsers'
  });

  // User associations for social media
  User.hasMany(UserSocialMedia, {
    foreignKey: 'user_id',
    as: 'userSocialMedias'
  });

  // Shipment associations
  Shipment.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user'
  });

  Shipment.belongsTo(Address, {
    foreignKey: 'to_address',
    as: 'toAddress'
  });

  Shipment.belongsTo(Address, {
    foreignKey: 'from_address',
    as: 'fromAddress'
  });

  // Address associations
  Address.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user'
  });

  Address.hasMany(Shipment, {
    foreignKey: 'to_address',
    as: 'toShipments'
  });

  Address.hasMany(Shipment, {
    foreignKey: 'from_address',
    as: 'fromShipments'
  });

  // CategoryShippingRate associations
  CategoryShippingRate.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user'
  });

  CategoryShippingRate.belongsTo(Category, {
    foreignKey: 'category_id',
    as: 'category'
  });

  // User associations for shipping rates
  User.hasMany(CategoryShippingRate, {
    foreignKey: 'user_id',
    as: 'shippingRates'
  });

  // Category associations for shipping rates
  Category.hasMany(CategoryShippingRate, {
    foreignKey: 'category_id',
    as: 'shippingRates'
  });
}

// Export all models for easy importing
export {
  User,
  Category,
  TradingCard,
  CardCondition,
  CardImage,
  CategoryField,
  Follower,
  CreditPurchaseLog,
  CreditDeductionLog,
  InterestedIn,
  UserSocialMedia,
  SocialMedia,
  Shipment,
  Address,
  CategoryShippingRate
};
