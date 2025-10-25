import {
    Table,
    Column,
    Model,
    DataType,
    PrimaryKey,
    AutoIncrement,
    ForeignKey,
    BelongsTo,
    CreatedAt,
    UpdatedAt,
  } from 'sequelize-typescript';
  import { Cart } from './cart.model.js';
  
  @Table({
    tableName: 'cart_details',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  })
  export class CartDetail extends Model<CartDetail> {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.BIGINT)
    id!: number;
  
    @ForeignKey(() => Cart)
    @Column(DataType.BIGINT)
    cart_id!: number;
  
    @Column(DataType.BIGINT)
    user_id!: number;
  
    @Column(DataType.BIGINT)
    product_id!: number;
  
    @Column(DataType.DOUBLE)
    product_amount!: number;
  
  @Column({ type: DataType.DATE, field: 'hold_expires_at' })
  hold_expires_at?: Date;
  
    @CreatedAt
    @Column({ field: 'created_at', type: DataType.DATE })
    created_at!: Date;
  
    @UpdatedAt
    @Column({ field: 'updated_at', type: DataType.DATE })
    updated_at!: Date;
  
    // Relations
    @BelongsTo(() => Cart)
    cart!: Cart;
  }
  