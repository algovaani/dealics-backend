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
    tableName: 'review_collections',
    timestamps: true, // because created_at & updated_at exist
    underscored: true, // converts camelCase → snake_case automatically
  })
  export class ReviewCollection extends Model<ReviewCollection> {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.BIGINT.UNSIGNED)
    id!: number;
  
    @Column(DataType.BIGINT)
    review_id!: number | null;
  
    @Column(DataType.BIGINT)
    buy_sell_card_id!: number;
  
    @Column(DataType.BIGINT)
    user_id!: number | null;
  
    @Column(DataType.BIGINT)
    sender_id!: number | null;
  
    @Column(DataType.DOUBLE)
    rating!: number | null;
  
    @Column(DataType.TEXT)
    content!: string | null;
  
    @CreatedAt
    @Column(DataType.DATE)
    created_at!: Date;
  
    @UpdatedAt
    @Column(DataType.DATE)
    updated_at!: Date;
  }
  