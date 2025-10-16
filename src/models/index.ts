import { Sequelize } from 'sequelize-typescript';
import { User } from './user.model.js';
import { Category } from './category.model.js';
import { TradingCard } from './tradingcard.model.js';
import { CardCondition } from './cardCondition.model.js';
import { CardImage } from './card_image.model.js';
import { CategoryField } from './categoryField.model.js';
import { ItemColumn } from './itemColumn.model.js';
import { Follower } from './follower.model.js';
import { CreditPurchaseLog } from './creditPurchaseLog.model.js';
import { CreditDeductionLog } from './creditDeductionLog.model.js';
import { InterestedIn } from './interestedIn.model.js';
import { UserSocialMedia } from './userSocialMedia.model.js';
import { SocialMedia } from './socialMedia.model.js';
import { Shipment } from './shipment.model.js';
import { Address } from './address.model.js';
import { CategoryShippingRate } from './categoryShippingRates.model.js';
import { BuySellCard } from './buySellCard.model.js';
import { BuyOfferStatus } from './buyOfferStatus.model.js';
import { TradeProposal } from './tradeProposal.model.js';
import { TradeProposalStatus } from './tradeProposalStatus.model.js';
import { TradeTransaction } from './tradeTransactions.model.js';
import { TradeNotification } from './tradeNotification.model.js';
import { ReviewCollection } from './reviewCollection.model.js';
import { Review } from './reviews.model.js';
import { Support } from './support.model.js';
import { Cart } from './cart.model.js';
import { CartDetail } from './cartDetail.model.js';
import { BuyOfferAttempt } from './buyOfferAttempt.model.js';
import { BuyOfferProduct } from './buyOfferProduct.model.js';
import { PublicationYear } from './publicationYear.model.js';
import { Player } from './player.model.js';
import { ProductAttribute } from './productAttribute.model.js';
import { NotificationTemplate } from './notificationTemplate.model.js';
import { ReleaseYear } from './releaseYear.model.js';
import { Year } from './year.model.js';
import { YearOfIssue } from './yearOfIssue.model.js';
import { VehicleYear } from './vehicleYear.model.js';
import { YearOfManufacture } from './yearOfManufacture.model.js';
import { Dictionary } from './dictionary.model.js';
import { Brand } from './brand.model.js';
import { Package } from './package.model.js';
import { ConventionEvent } from './conventionEvent.model.js';
import { Country } from './country.model.js';
import { CoinName } from './coinName.model.js';
import { Denomination } from './denomination.model.js';
import { Circulated } from './circulated.model.js';
import { Publisher } from './publisher.model.js';
import { ItemType } from './itemType.model.js';
import { Genre } from './genre.model.js';
import { Feature } from './feature.model.js';
import { SuperheroTeam } from './superheroTeam.model.js';
import { StorageCapacity } from './storageCapacities.model.js';
import { ConsoleModel } from './consoleModel.model.js';
import { RegionCode } from './regionCode.model.js';
import { Edition } from './edition.model.js';
import { PlatformConsole } from './platformConsoles.model.js';
import { Speed } from './speed.model.js';
import { Type } from './type.model.js';
import { RecordSize } from './recordSize.model.js';
import { MintMark } from './mintMarks.model.js';
import { Certification } from './certification.model.js';
import { SleeveGrader } from './sleeveGrader.model.js';
import { SleeveGradeRating } from './sleeveGradeRating.model.js';
import { RecordGrader } from './recordGrader.model.js';
import { RecordGradeRating } from './recordGradeRating.model.js';
import { ExclusiveEventRetailer } from './exclusiveEventRetailers.model.js';
import { Block } from './block.model.js';

// Import all models here
export const models = [
  User,
  Category,
  TradingCard,
  CardCondition,
  CardImage,
  CategoryField,
  ItemColumn,
  Follower,
  CreditPurchaseLog,
  CreditDeductionLog,
  InterestedIn,
  UserSocialMedia,
  SocialMedia,
  Shipment,
  Address,
  CategoryShippingRate,
  BuySellCard,
  BuyOfferStatus,
  TradeProposal,
  TradeProposalStatus,
  TradeTransaction,
  TradeNotification,
  ReviewCollection,
  Review,
  Support,
  Cart,
  CartDetail,
  BuyOfferAttempt,
  BuyOfferProduct,
  ProductAttribute,
  NotificationTemplate,
  PublicationYear,
  Player,
  ReleaseYear,
  Year,
  YearOfIssue,
  VehicleYear,
  YearOfManufacture
  ,Dictionary
  ,Publisher
  ,Brand
  ,Package
  ,ConventionEvent
  ,Country
  ,CoinName
  ,Denomination
  ,Circulated
  ,ItemType
  ,Genre
  ,Feature
  ,SuperheroTeam
  ,StorageCapacity
  ,ConsoleModel
  ,RegionCode
  ,Edition
  ,PlatformConsole
  ,Speed
  ,Type
  ,RecordSize
  ,MintMark
  ,Certification
  ,SleeveGrader
  ,SleeveGradeRating
  ,RecordGrader
  ,RecordGradeRating
  ,ExclusiveEventRetailer
  ,Block
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

  CategoryField.belongsTo(ItemColumn, {
    foreignKey: 'fields',
    targetKey: 'name',
    as: 'item_column'
  });

  ItemColumn.hasMany(CategoryField, {
    foreignKey: 'fields',
    sourceKey: 'name',
    as: 'categoryFields'
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

  // BuySellCard associations
  BuySellCard.belongsTo(User, {
    foreignKey: 'seller',
    as: 'sellerUser'
  });

  BuySellCard.belongsTo(User, {
    foreignKey: 'buyer',
    as: 'buyerUser'
  });

  BuySellCard.belongsTo(TradingCard, {
    foreignKey: 'main_card',
    as: 'tradingCard'
  });

  // User associations for BuySellCard
  User.hasMany(BuySellCard, {
    foreignKey: 'seller',
    as: 'soldCards'
  });

  User.hasMany(BuySellCard, {
    foreignKey: 'buyer',
    as: 'boughtCards'
  });

  // TradingCard associations for BuySellCard
  TradingCard.hasMany(BuySellCard, {
    foreignKey: 'main_card',
    as: 'buySellRecords'
  });

  // BuyOfferStatus associations
  BuySellCard.belongsTo(BuyOfferStatus, {
    foreignKey: 'buy_offer_status_id',
    as: 'buyOfferStatus'
  });

  BuyOfferStatus.hasMany(BuySellCard, {
    foreignKey: 'buy_offer_status_id',
    as: 'buySellCards'
  });

  // Shipment associations with BuySellCard
  BuySellCard.hasMany(Shipment, {
    foreignKey: 'buy_sell_id',
    as: 'shipmentDetails'
  });

  Shipment.belongsTo(BuySellCard, {
    foreignKey: 'buy_sell_id',
    as: 'buySellCard'
  });

  // BuyOfferProduct associations
  BuyOfferProduct.belongsTo(BuySellCard, {
    foreignKey: 'buy_sell_id',
    as: 'buySellCard'
  });

  BuyOfferProduct.belongsTo(TradingCard, {
    foreignKey: 'main_card',
    as: 'product'
  });

  // BuySellCard associations for BuyOfferProduct
  BuySellCard.hasMany(BuyOfferProduct, {
    foreignKey: 'buy_sell_id',
    as: 'buyOfferProducts'
  });

  // TradingCard associations for BuyOfferProduct
  TradingCard.hasMany(BuyOfferProduct, {
    foreignKey: 'main_card',
    as: 'buyOfferProducts'
  });

  // TradeProposal associations
  TradeProposal.belongsTo(User, {
    foreignKey: 'trade_sent_by',
    as: 'tradeSender'
  });

  TradeProposal.belongsTo(User, {
    foreignKey: 'trade_sent_to',
    as: 'tradeReceiver'
  });

  TradeProposal.belongsTo(TradingCard, {
    foreignKey: 'main_card',
    as: 'mainTradingCard'
  });

  TradeProposal.belongsTo(TradeProposalStatus, {
    foreignKey: 'trade_proposal_status_id',
    as: 'tradeProposalStatus'
  });

  // User associations for TradeProposal
  User.hasMany(TradeProposal, {
    foreignKey: 'trade_sent_by',
    as: 'sentTrades'
  });

  User.hasMany(TradeProposal, {
    foreignKey: 'trade_sent_to',
    as: 'receivedTrades'
  });

  // TradingCard associations for TradeProposal
  TradingCard.hasMany(TradeProposal, {
    foreignKey: 'main_card',
    as: 'tradeProposals'
  });

  // TradeProposalStatus associations
  TradeProposalStatus.hasMany(TradeProposal, {
    foreignKey: 'trade_proposal_status_id',
    as: 'tradeProposals'
  });

  // TradeProposal associations with Shipment
  TradeProposal.hasMany(Shipment, {
    foreignKey: 'trade_id',
    as: 'shipmenttrader',
    sourceKey: 'id',
    scope: {
      // This will be filtered in the service layer by user_id
    }
  });
  TradeProposal.hasMany(Shipment, {
    foreignKey: 'trade_id',
    as: 'shipmentself',
    sourceKey: 'id',
    scope: {
      // This will be filtered in the service layer by user_id
    }
  });
  Shipment.belongsTo(TradeProposal, {
    foreignKey: 'trade_id',
    as: 'tradeProposal',
    targetKey: 'id'
  });

  // TradeTransaction associations
  TradeTransaction.belongsTo(User, {
    foreignKey: 'trade_sent_by_key',
    as: 'tradeSender'
  });
  TradeTransaction.belongsTo(User, {
    foreignKey: 'trade_sent_to_key',
    as: 'tradeReceiver'
  });
  TradeTransaction.belongsTo(TradeProposal, {
    foreignKey: 'trade_proposal_id',
    as: 'tradeProposal'
  });
  
  // User associations for TradeTransaction
  User.hasMany(TradeTransaction, {
    foreignKey: 'trade_sent_by_key',
    as: 'sentTradeTransactions'
  });
  User.hasMany(TradeTransaction, {
    foreignKey: 'trade_sent_to_key',
    as: 'receivedTradeTransactions'
  });
  
  // TradeProposal associations for TradeTransaction
  TradeProposal.hasMany(TradeTransaction, {
    foreignKey: 'trade_proposal_id',
    as: 'tradeTransactions'
  });

  // TradeNotification associations
  TradeNotification.belongsTo(User, {
    foreignKey: 'notification_sent_by',
    as: 'sender'
  });
  TradeNotification.belongsTo(User, {
    foreignKey: 'notification_sent_to',
    as: 'receiver'
  });
  
  // User associations for TradeNotification
  User.hasMany(TradeNotification, {
    foreignKey: 'notification_sent_by',
    as: 'sentNotifications'
  });
  User.hasMany(TradeNotification, {
    foreignKey: 'notification_sent_to',
    as: 'receivedNotifications'
  });

  // Cart associations
  Cart.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user'
  });

  Cart.belongsTo(User, {
    foreignKey: 'seller_id',
    as: 'seller'
  });

  Cart.hasMany(CartDetail, {
    foreignKey: 'cart_id',
    as: 'cartDetails'
  });

  // CartDetail associations (Cart association already defined in model)
  CartDetail.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user'
  });

  CartDetail.belongsTo(TradingCard, {
    foreignKey: 'product_id',
    as: 'product'
  });

  // User associations for Cart
  User.hasMany(Cart, {
    foreignKey: 'user_id',
    as: 'carts'
  });

  User.hasMany(Cart, {
    foreignKey: 'seller_id',
    as: 'sellerCarts'
  });

  User.hasMany(CartDetail, {
    foreignKey: 'user_id',
    as: 'cartDetails'
  });

  // TradingCard associations for CartDetail
  TradingCard.hasMany(CartDetail, {
    foreignKey: 'product_id',
    as: 'cartDetails'
  });

  // BuyOfferAttempt associations
  BuyOfferAttempt.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user'
  });

  BuyOfferAttempt.belongsTo(TradingCard, {
    foreignKey: 'product_id',
    as: 'product'
  });

  // User associations for BuyOfferAttempt
  User.hasMany(BuyOfferAttempt, {
    foreignKey: 'user_id',
    as: 'buyOfferAttempts'
  });

  // TradingCard associations for BuyOfferAttempt
  TradingCard.hasMany(BuyOfferAttempt, {
    foreignKey: 'product_id',
    as: 'buyOfferAttempts'
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
  ItemColumn,
  Follower,
  CreditPurchaseLog,
  CreditDeductionLog,
  InterestedIn,
  UserSocialMedia,
  SocialMedia,
  Shipment,
  Address,
  CategoryShippingRate,
  BuySellCard,
  BuyOfferStatus,
  TradeProposal,
  TradeProposalStatus,
  TradeTransaction,
  TradeNotification,
  NotificationTemplate,
  ReviewCollection,
  Review,
  Support,
  Cart,
  CartDetail,
  BuyOfferAttempt,
  BuyOfferProduct,
  PublicationYear,
  Player,
  ReleaseYear,
  Year,
  YearOfIssue,
  VehicleYear,
  YearOfManufacture
  ,Dictionary
  ,Publisher
  ,Brand
  ,Package
  ,ConventionEvent
  ,Country
  ,CoinName
  ,Denomination
  ,Circulated
  ,ItemType
  ,Genre
  ,Feature
  ,SuperheroTeam
  ,StorageCapacity
  ,ConsoleModel
  ,RegionCode
  ,Edition
  ,PlatformConsole
  ,Speed
  ,Type
  ,RecordSize
  ,MintMark
  ,Certification
  ,SleeveGrader
  ,SleeveGradeRating
  ,RecordGrader
  ,RecordGradeRating
  ,ExclusiveEventRetailer
  ,Block
};
