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
  tableName: 'product_attributes',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
})
export class ProductAttribute extends Model<ProductAttribute> {
  @PrimaryKey
  @AutoIncrement
  @Column({
    type: DataType.BIGINT.UNSIGNED,
  })
  id!: number;

  @Column({
    type: DataType.BIGINT,
    allowNull: false,
  })
  product_id!: number;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  collection?: string;

  @CreatedAt
  @Column({
    field: 'created_at',
    type: DataType.DATE,
  })
  created_at!: Date;

  @UpdatedAt
  @Column({
    field: 'updated_at',
    type: DataType.DATE,
  })
  updated_at!: Date;
}
