import {
    Table,
    Column,
    Model,
    DataType,
    PrimaryKey,
    AutoIncrement,
    Default,
  } from 'sequelize-typescript';
  
  @Table({
    tableName: 'trade_notification',
    timestamps: false, // using created_at and updated_at manually
  })
  export class TradeNotification extends Model<TradeNotification> {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.BIGINT.UNSIGNED)
    id!: number;
  
    @Column(DataType.BIGINT)
    notification_sent_by?: number;
  
    @Column(DataType.BIGINT)
    notification_sent_to?: number;
  
    @Column(DataType.BIGINT)
    trade_proposal_id?: number;
  
    @Column(DataType.BIGINT)
    buy_sell_card_id?: number;
  
    @Column(DataType.STRING(255))
    message?: string;
  
    @Column(DataType.STRING(255))
    description?: string;
  
    @Default(0)
    @Column(DataType.TINYINT)
    seen!: number;
  
    @Column(DataType.DATE)
    created_at?: Date;
  
    @Column(DataType.DATE)
    updated_at?: Date;
  }
  