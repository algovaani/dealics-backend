import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement, Default, CreatedAt, UpdatedAt } from 'sequelize-typescript';

@Table({
  tableName: 'formats',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
})
export class Format extends Model<Format> {

  @PrimaryKey
  @AutoIncrement
  @Column({
    type: DataType.BIGINT.UNSIGNED,
  })
  id!: number;

  @Column({
    type: DataType.STRING(75),
    allowNull: true,
  })
  name!: string | null;

  // category_id is stored as text in DB. 
  // If it contains multiple ids (comma-separated or JSON), you can adjust accordingly
  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  category_id!: string | null;

  @Default('1')
  @Column({
    type: DataType.ENUM('1', '0'),
    allowNull: false,
  })
  status!: '1' | '0';

  @CreatedAt
  @Column({
    type: DataType.DATE,
  })
  created_at!: Date;

  @UpdatedAt
  @Column({
    type: DataType.DATE,
  })
  updated_at!: Date;
}
