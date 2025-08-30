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
    tableName: 'category_shipping_rates',
    timestamps: true, // Because you have created_at & updated_at
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  })
  export class CategoryShippingRate extends Model<CategoryShippingRate> {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.BIGINT)
    id!: number;
  
    @Column(DataType.BIGINT)
    category_id!: number;
  
    @Column(DataType.BIGINT)
    user_id!: number;
  
    @Column(DataType.DOUBLE)
    usa_rate!: number;
  
    @Column(DataType.DOUBLE)
    canada_rate!: number;
  
    @CreatedAt
    @Column({ field: 'created_at', type: DataType.DATE })
    created_at!: Date;
  
    @UpdatedAt
    @Column({ field: 'updated_at', type: DataType.DATE })
    updated_at!: Date;
  }
  