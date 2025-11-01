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
  tableName: 'earn_credits',
  timestamps: true, // Sequelize created_at & updated_at automatically manage karega
})
export class EarnCredit extends Model<EarnCredit> {
  @PrimaryKey
  @AutoIncrement
  @Column({
    type: DataType.BIGINT.UNSIGNED,
  })
  id!: number;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  type?: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  title?: string;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  amount?: number;

  @Column({
    type: DataType.ENUM('1', '0'),
    allowNull: false,
    defaultValue: '1',
  })
  status!: '1' | '0';

  @CreatedAt
  @Column({
    field: 'created_at',
    type: DataType.DATE,
    defaultValue: DataType.NOW,
  })
  createdAt?: Date;

  @UpdatedAt
  @Column({
    field: 'updated_at',
    type: DataType.DATE,
  })
  updatedAt?: Date;
}
