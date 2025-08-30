import {
    Table,
    Column,
    Model,
    DataType,
    PrimaryKey,
    AutoIncrement,
    AllowNull,
  } from 'sequelize-typescript';
  
  @Table({
    tableName: 'country_shipping_rates',
    timestamps: false, // created_at and updated_at are VARCHAR, not TIMESTAMP
  })
  export class CountryShippingRate extends Model<CountryShippingRate> {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    id!: number;
  
    @AllowNull(false)
    @Column(DataType.INTEGER)
    user_id!: number;
  
    @AllowNull(true)
    @Column(DataType.STRING)
    usa_shipping_flat_rate!: string | null;
  
    @AllowNull(true)
    @Column(DataType.STRING)
    canada_shipping_flat_rate!: string | null;
  
    @AllowNull(false)
    @Column(DataType.STRING)
    created_at!: string;
  
    @AllowNull(false)
    @Column(DataType.STRING)
    updated_at!: string;
  }
  