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
    tableName: "buy_sell_cards",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  })
  export class BuySellCard extends Model<BuySellCard> {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.BIGINT.UNSIGNED)
    id!: number;
  
    @AllowNull
    @Column(DataType.STRING(50))
    code?: string;
  
    @AllowNull
    @Column(DataType.BIGINT)
    seller?: number;
  
    @AllowNull
    @Column(DataType.BIGINT)
    buyer?: number;
  
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
  
    @AllowNull
    @Column(DataType.DECIMAL(12, 2))
    paid_amount?: number;
  
    @AllowNull
    @Column(DataType.DATE)
    amount_paid_on?: Date;
  
    @AllowNull
    @Column(DataType.STRING(255))
    amount_pay_id?: string;
  
    @AllowNull
    @Column(DataType.STRING(255))
    amount_payer_id?: string;
  
    @AllowNull
    @Column(DataType.STRING(255))
    amount_pay_status?: string;
  
    @AllowNull
    @Column(DataType.TEXT)
    paypal_response?: string;
  
    @Default("new")
    @Column(
      DataType.ENUM(
        "new",
        "purchased",
        "declined",
        "dispatched",
        "delivered",
        "confirmed_by_buyer",
        "cancelled"
      )
    )
    buying_status!: string;
  
    @AllowNull
    @Column(DataType.STRING(255))
    track_id?: string;
  
    @AllowNull
    @Column(DataType.DATE)
    shipped_on?: Date;
  
    @AllowNull
    @Column(DataType.STRING(255))
    shiping_address?: string;
  
    @AllowNull
    @Column(DataType.BIGINT)
    buyer_rating?: number;
  
    @AllowNull
    @Column(DataType.TEXT)
    buyer_review?: string;
  
    @AllowNull
    @Column(DataType.DATE)
    reviewed_on?: Date;
  
    @AllowNull
    @Column(DataType.BIGINT)
    seller_rating?: number;
  
    @AllowNull
    @Column(DataType.TEXT)
    seller_review?: string;
  
    @AllowNull
    @Column(DataType.DATE)
    reviewed_by_seller_on?: Date;
  
    @Default(0)
    @Column(DataType.TINYINT)
    is_received!: number;
  
    @AllowNull
    @Column(DataType.DATE)
    received_on?: Date;
  
    @Default(0)
    @Column(DataType.TINYINT)
    is_payment_received!: number;
  
    @AllowNull
    @Column(DataType.DATE)
    payment_received_on?: Date;
  
    @Default(0)
    @Column(DataType.INTEGER)
    invalid_offer_count!: number;
  
    @Default(0)
    @Column(DataType.TINYINT)
    is_payment_init!: number;
  
    @AllowNull
    @Column(DataType.DATE)
    payment_init_date?: Date;
  
    @AllowNull
    @Column(DataType.BIGINT)
    buy_offer_status_id?: number;
  
    @AllowNull
    @Column(DataType.DOUBLE)
    products_offer_amount?: number;
  
    @AllowNull
    @Column(DataType.DOUBLE)
    shipment_amount?: number;
  
    @AllowNull
    @Column(DataType.DOUBLE)
    total_amount?: number;
  }
  