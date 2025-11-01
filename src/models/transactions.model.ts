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
    type: DataType.STRING(255),
    allowNull: true,
  })
  burn_address?: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  transaction_hash?: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  block_no?: string;
  
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
    type: DataType.ENUM('Pending', 'Rejected', 'Completed'),
    allowNull: false,
    defaultValue: 'Pending',
  })
  transaction_status!: 'Pending' | 'Rejected' | 'Completed';

  @Column({
    type: DataType.ENUM('1', '0'),
    allowNull: false,
    defaultValue: '1',
  })
  status!: '1' | '0';

  @ForeignKey(() => User)
  @Column({
    type: DataType.BIGINT,
    allowNull: true,
  })
  user_id?: number;

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

  // Relations are registered centrally in `models/index.ts` to avoid duplicate aliases
}