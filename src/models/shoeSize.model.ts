import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  AutoIncrement,
  AllowNull,
  Default,
  CreatedAt,
  UpdatedAt
} from 'sequelize-typescript';

@Table({
  tableName: 'shoe_sizes',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
})
export class ShoeSize extends Model<ShoeSize> {
  @PrimaryKey
  @AutoIncrement
  @Column({ type: DataType.BIGINT.UNSIGNED })
  id!: number;

  @AllowNull(true)
  @Column({ type: DataType.STRING(75) })
  name?: string;

  @AllowNull(true)
  @Column({ type: DataType.BIGINT, field: 'category_id' })
  categoryId?: number;

  @Default('1')
  @Column({ type: DataType.ENUM('1', '0') })
  status!: '1' | '0';

  @CreatedAt
  @Column({ type: DataType.DATE, field: 'created_at' })
  createdAt!: Date;

  @UpdatedAt
  @Column({ type: DataType.DATE, field: 'updated_at' })
  updatedAt!: Date;
}
