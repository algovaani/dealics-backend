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
    tableName: 'interested_in',
    timestamps: true, // because you have created_at & updated_at
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  })
  export class InterestedIn extends Model<InterestedIn> {
    @PrimaryKey
    @AutoIncrement
    @Column({
      type: DataType.BIGINT.UNSIGNED,
    })
    id!: number;
  
    @AllowNull(true)
    @Column({
      type: DataType.BIGINT,
      field: 'trading_card_id',
    })
    tradingCardId?: number;
  
    @AllowNull(true)
    @Column({
      type: DataType.BIGINT,
      field: 'trader_id',
    })
    traderId?: number;
  
    @AllowNull(true)
    @Column({
      type: DataType.BIGINT,
      field: 'user_id',
    })
    userId?: number;
  
    @Default('1')
    @Column({
      type: DataType.ENUM('1', '0'),
      field: 'interested_status',
    })
    interestedStatus!: '1' | '0';
  
    @CreatedAt
    @AllowNull(true)
    @Column({
      type: DataType.DATE,
      field: 'created_at',
    })
    createdAt?: Date;
  
    @UpdatedAt
    @AllowNull(true)
    @Column({
      type: DataType.DATE,
      field: 'updated_at',
    })
    updatedAt?: Date;
  }
  