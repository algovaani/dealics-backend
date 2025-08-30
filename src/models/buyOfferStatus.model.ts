import {
    Table,
    Column,
    Model,
    DataType,
    PrimaryKey,
    AutoIncrement,
    AllowNull,
    Default,
  } from "sequelize-typescript";
  
  @Table({
    tableName: "buy_offer_statuses",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  })
  export class BuyOfferStatus extends Model<BuyOfferStatus> {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.BIGINT.UNSIGNED)
    id!: number;
  
    @AllowNull
    @Column(DataType.STRING(255))
    alias?: string;
  
    @AllowNull
    @Column(DataType.STRING(255))
    name?: string;
  
    @AllowNull
    @Column(DataType.STRING(255))
    to_sender?: string;
  
    @AllowNull
    @Column(DataType.STRING(255))
    to_receiver?: string;
  
    @Default("1")
    @Column(DataType.ENUM("1", "0"))
    status!: "1" | "0"; // 1 = Active, 0 = Inactive
  }
  