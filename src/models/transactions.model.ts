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
  tableName: 'transactions',
  timestamps: true, // created_at & updated_at automatically manage honge
})
export class Transaction extends Model<Transaction> {
  @PrimaryKey
  @AutoIncrement
  @Column({
    type: DataType.BIGINT.UNSIGNED,
  })
  id!: number;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  payment_id?: string;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  amount?: number;

  @Column({
    type: DataType.ENUM('Purchase', 'DLX Redemption', 'Listing Fee'),
    allowNull: false,
    defaultValue: 'Purchase',
  })
  type!: 'Purchase' | 'DLX Redemption' | 'Listing Fee';

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
    field: 'Note', // since MySQL column name is capitalized
  })
  note?: string;

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
  })
  createdAt?: Date;

  @UpdatedAt
  @Column({
    field: 'updated_at',
    type: DataType.DATE,
  })
  updatedAt?: Date;
}