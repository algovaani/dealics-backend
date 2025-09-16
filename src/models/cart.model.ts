import {
    Table,
    Column,
    Model,
    DataType,
    PrimaryKey,
    AutoIncrement,
    CreatedAt,
    UpdatedAt,
    ForeignKey,
  } from 'sequelize-typescript';
  import { User } from './user.model.js';
  
  @Table({
    tableName: 'carts',
    timestamps: true, // since created_at and updated_at exist
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  })
  export class Cart extends Model<Cart> {
    @PrimaryKey
    @AutoIncrement
    @Column({
      type: DataType.BIGINT,
      allowNull: false,
    })
    id!: number;
  
    @ForeignKey(() => User)
    @Column({
      type: DataType.BIGINT,
      allowNull: true,
    })
    user_id!: number | null;

    @ForeignKey(() => User)
    @Column({
      type: DataType.BIGINT,
      allowNull: true,
    })
    seller_id!: number | null;
  
    @Column({
      type: DataType.DOUBLE,
      allowNull: true,
    })
    cart_amount!: number | null;
  
    @Column({
      type: DataType.DOUBLE,
      allowNull: true,
    })
    shipping_fee!: number | null;
  
    @Column({
      type: DataType.DOUBLE,
      allowNull: true,
    })
    total_amount!: number | null;
  
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
  