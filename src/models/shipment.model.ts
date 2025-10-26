import {
    Table,
    Column,
    Model,
    DataType,
    PrimaryKey,
    AutoIncrement,
    CreatedAt,
    UpdatedAt,
  } from 'sequelize-typescript';
  
  @Table({
    tableName: 'shipments',
    timestamps: true, // created_at, updated_at
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  })
  export class Shipment extends Model<Shipment> {
    @PrimaryKey
    @AutoIncrement
    @Column({
      type: DataType.BIGINT,
      allowNull: false,
    })
    id!: number;
  
    @Column({
      type: DataType.BIGINT,
      allowNull: false,
    })
    user_id!: number;
  
    @Column({
      type: DataType.BIGINT,
      allowNull: false,
    })
    to_address!: number;
  
    @Column({
      type: DataType.BIGINT,
      allowNull: false,
    })
    from_address!: number;
  
    @Column({
      type: DataType.JSON,
      allowNull: true,
    })
    parcel!: object | null;
  
    @Column({
      type: DataType.STRING(5),
      allowNull: false,
      defaultValue: 'lbs',
    })
    parcel_weight_unit!: string;
  
    @Column({
      type: DataType.STRING,
      allowNull: true,
    })
    service!: string | null;
  
    @Column({
      type: DataType.DOUBLE,
      allowNull: true,
    })
    cart_amount_for_insurance!: number | null;
  
    @Column({
      type: DataType.STRING,
      allowNull: true,
    })
    insurance!: string | null;
  
    @Column({
      type: DataType.STRING,
      allowNull: true,
    })
    trade_id!: string | null;
  
    @Column({
      type: DataType.BIGINT,
      allowNull: true,
    })
    buy_sell_id!: number | null;
  
    @Column({
      type: DataType.STRING,
      allowNull: true,
    })
    postage_label!: string | null;
  
    @Column({
      type: DataType.STRING,
      allowNull: true,
    })
    carbon_offset!: string | null;
  
    @Column({
      type: DataType.JSON,
      allowNull: true,
    })
    shipment_response!: object | null;
  
    @Column({
      type: DataType.STRING,
      allowNull: true,
    })
    selected_rate!: string | null;
  
    @Column({
      type: DataType.STRING,
      allowNull: true,
    })
    tracking_id!: string | null;
  
    @Column({
      type: DataType.ENUM('0', '1'),
      allowNull: false,
      defaultValue: '0',
      comment: '0=Pending, 1=Completed',
    })
    is_completed!: '0' | '1';
  
    @Column({
      type: DataType.STRING,
      allowNull: true,
    })
    paymentId!: string | null;
  
    @Column({
      type: DataType.STRING,
      allowNull: true,
    })
    token!: string | null;
  
    @Column({
      type: DataType.STRING,
      allowNull: true,
    })
    PayerID!: string | null;
  
    @Column({
      type: DataType.TINYINT,
      allowNull: false,
      defaultValue: 2,
      comment: '1 for paid, 2 for pending, 3 for cancelled',
    })
    shipment_payment_status!: number;
  
    @Column({
      type: DataType.STRING(55),
      allowNull: true,
      defaultValue: 'Pre-Transit',
    })
    shipment_status!: string | null;
  
    @Column({
      type: DataType.DATE,
      allowNull: true,
    })
    estimated_delivery_date!: Date | null;
  
    @Column({
      type: DataType.DATEONLY,
      allowNull: true,
    })
    cron_shipment_date!: Date | null;
  
    @Column({
      type: DataType.TINYINT,
      allowNull: true,
      defaultValue: 0,
    })
    is_insured!: number | null;
  
    @CreatedAt
    @Column({
      type: DataType.DATE,
      field: 'created_at',
    })
    created_at!: Date;
  
    @UpdatedAt
    @Column({
      type: DataType.DATE,
      field: 'updated_at',
    })
    updated_at!: Date;
  }
  