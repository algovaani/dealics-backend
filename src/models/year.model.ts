import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  AutoIncrement,
  Default,
} from 'sequelize-typescript';

@Table({
  tableName: 'years',
  timestamps: true,
  underscored: true,
})
export class Year extends Model<Year> {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.BIGINT.UNSIGNED)
  id!: number;

  @Column(DataType.STRING(75))
  name?: string;

  @Column(DataType.TEXT)
  category_id?: string;

  @Default('1')
  @Column(DataType.ENUM('1', '0'))
  status!: '1' | '0';

  @Column(DataType.DATE)
  created_at?: Date;

  @Column(DataType.DATE)
  updated_at?: Date;
}


