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
  } from 'sequelize-typescript';
  
  @Table({
    tableName: 'credit_purchase_logs',
    timestamps: true, // because we have created_at & updated_at
    underscored: true,
  })
  export class CreditPurchaseLog extends Model<CreditPurchaseLog> {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.BIGINT.UNSIGNED)
    id!: number;
  
    @AllowNull(true)
    @Column(DataType.STRING(50))
    invoice_number?: string;
  
    @AllowNull(true)
    @Column(DataType.BIGINT.UNSIGNED)
    user_id?: number;
  
    @AllowNull(true)
    @Column(DataType.INTEGER)
    coins?: number;
  
    @AllowNull(true)
    @Column(DataType.DECIMAL(12, 2))
    amount?: number;
  
    @AllowNull(true)
    @Column(DataType.STRING(50))
    transaction_id?: string;
  
    @AllowNull(true)
    @Column(DataType.STRING(30))
    payment_status?: string;
  
    @AllowNull(true)
    @Column(DataType.STRING(75))
    payee_email_address?: string;
  
    @AllowNull(true)
    @Column(DataType.STRING(50))
    merchant_id?: string;
  
    @AllowNull(true)
    @Column(DataType.STRING(50))
    payment_source?: string;
  
    @AllowNull(true)
    @Column(DataType.STRING(50))
    payer_id?: string;
  
    @AllowNull(true)
    @Column(DataType.STRING(50))
    payer_full_name?: string;
  
    @AllowNull(true)
    @Column(DataType.STRING(75))
    payer_email_address?: string;
  
    @AllowNull(true)
    @Column(DataType.STRING(255))
    payer_address?: string;
  
    @AllowNull(true)
    @Column(DataType.STRING(5))
    payer_country_code?: string;
  
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
  