import {
    Table,
    Column,
    Model,
    DataType,
    PrimaryKey,
    AutoIncrement,
    CreatedAt,
    UpdatedAt,
    HasMany,
  } from 'sequelize-typescript';
  import { TradingCard } from './tradingcard.model.js';
  
  @Table({
    tableName: 'card_conditions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  })
  export class CardCondition extends Model<CardCondition> {
    @PrimaryKey
    @AutoIncrement
    @Column({
      type: DataType.INTEGER,
    })
    id!: number;
  
    @Column({
      type: DataType.STRING(255),
      allowNull: true,
    })
    card_condition_name?: string;
  
         @Column({
       type: DataType.INTEGER,
       allowNull: true,
     })
     category_id?: number;
  
    @Column({
      type: DataType.ENUM('1', '0'),
      allowNull: false,
      defaultValue: '1',
    })
    card_condition_status!: '1' | '0';
  
        @CreatedAt
    @Column({ field: 'created_at', type: DataType.DATE })
    created_at?: Date;

    @UpdatedAt
    @Column({ field: 'updated_at', type: DataType.DATE })
    updated_at?: Date;

    @HasMany(() => TradingCard)
    tradingCards?: TradingCard[];
  }
  