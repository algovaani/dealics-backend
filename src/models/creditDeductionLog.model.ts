import {
    Table,
    Column,
    Model,
    DataType,
    PrimaryKey,
    AutoIncrement,
    CreatedAt,
    UpdatedAt,
    AllowNull,
    Default,
  } from 'sequelize-typescript';
  
  @Table({
    tableName: 'credit_deduction_logs',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  })
  export class CreditDeductionLog extends Model<CreditDeductionLog> {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.BIGINT.UNSIGNED)
    id!: number;
  
    @AllowNull(true)
    @Column(DataType.BIGINT)
    trade_id?: number;
  
    @AllowNull(true)
    @Column(DataType.BIGINT)
    buy_sell_id?: number;
  
    @AllowNull(true)
    @Column(DataType.BIGINT)
    cart_detail_id?: number;
  
    @AllowNull(true)
    @Column(DataType.STRING(30))
    trade_status?: string;
  
    @AllowNull(true)
    @Column(DataType.BIGINT)
    sent_to?: number;
  
    @AllowNull(true)
    @Column(DataType.BIGINT)
    sent_by?: number;
  
    @AllowNull(true)
    @Column(DataType.INTEGER)
    coin?: number;
  
    @AllowNull(false)
    @Default('Success')
    @Column(DataType.ENUM('Success', 'Refund'))
    status!: 'Success' | 'Refund';
  
    @AllowNull(false)
    @Default('Both')
    @Column(DataType.ENUM('Free', 'Sender', 'Receiver', 'Both', 'Seller', 'Buyer'))
    deduction_from!: 'Free' | 'Sender' | 'Receiver' | 'Both' | 'Seller' | 'Buyer';
  
    @CreatedAt
    @Column({ field: 'created_at', type: DataType.DATE })
    created_at!: Date;
  
    @UpdatedAt
    @Column({ field: 'updated_at', type: DataType.DATE })
    updated_at!: Date;
  }
  