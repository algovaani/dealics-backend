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
  tableName: 'trade_proposal_statuses',
  timestamps: false, // using created_at and updated_at manually
})
export class TradeProposalStatus extends Model<TradeProposalStatus> {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.BIGINT.UNSIGNED)
  id!: number;

  @Column(DataType.STRING(255))
  alias?: string;

  @Column(DataType.STRING(255))
  name?: string;

  @Column(DataType.STRING(255))
  to_sender?: string;

  @Column(DataType.STRING(255))
  to_receiver?: string;

  @Default('1')
  @Column(DataType.ENUM('1', '0'))
  status!: '1' | '0';

  @Column(DataType.DATE)
  created_at?: Date;

  @Column(DataType.DATE)
  updated_at?: Date;
}