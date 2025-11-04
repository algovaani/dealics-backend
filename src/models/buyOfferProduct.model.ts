import { TradingCard } from "./tradingcard.model.js"; // ✅ make sure the path is correct
import { BelongsTo, ForeignKey } from "sequelize-typescript";
import {
    Table,
    Column,
    Model,
    DataType,
    PrimaryKey,
    AutoIncrement,
    AllowNull,
  } from "sequelize-typescript";
  
  @Table({
    tableName: "buyoffer_products",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  })
  export class BuyOfferProduct extends Model<BuyOfferProduct> {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.BIGINT.UNSIGNED)
    id!: number;
  
    @AllowNull
    @Column(DataType.BIGINT)
    buy_sell_id?: number;
  
    @ForeignKey(() => TradingCard)
    @AllowNull
    @Column(DataType.BIGINT)
    main_card?: number;
  
    @AllowNull
    @Column(DataType.DECIMAL(12, 2))
    trading_card_asking_price?: number;
  
    @AllowNull
    @Column(DataType.DECIMAL(12, 2))
    trading_card_offer_accept_above?: number;
  
    @AllowNull
    @Column(DataType.DECIMAL(12, 2))
    offer_amt_buyer?: number;

    @BelongsTo(() => TradingCard, { as: "tradingCard", foreignKey: "main_card" })
    tradingCard?: TradingCard;
  }
  