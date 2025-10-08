import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  AutoIncrement,
  AllowNull,
  Default,
} from 'sequelize-typescript';

@Table({
  tableName: 'publication_years',
  timestamps: true, // This will use createdAt and updatedAt automatically
})
export class PublicationYear extends Model<PublicationYear> {
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
