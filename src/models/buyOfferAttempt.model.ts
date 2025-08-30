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
    tableName: "buy_offer_attempts",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  })
  export class BuyOfferAttempt extends Model<BuyOfferAttempt> {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.BIGINT)
    id!: number;
  
    @AllowNull
    @Column(DataType.BIGINT)
    user_id?: number;
  
    @Column(DataType.BIGINT)
    product_id!: number;
  
    @Column(DataType.INTEGER)
    attempts!: number;
  
    @AllowNull
    @Column(DataType.DOUBLE)
    offer_amount?: number;
  }
  