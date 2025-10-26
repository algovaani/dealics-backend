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
  tableName: 'denominations',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
})
export class Denomination extends Model<Denomination> {
  @PrimaryKey
  @AutoIncrement
  @Column({ type: DataType.BIGINT.UNSIGNED })
  id!: number;

  @AllowNull(true)
  @Column({ type: DataType.STRING(100) })
  name?: string;

  @AllowNull(true)
  @Column({ type: DataType.TEXT, field: 'category_id' })
  categoryId?: string;

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
  