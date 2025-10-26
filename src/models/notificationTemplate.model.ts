import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  AutoIncrement,
  Default,
  AllowNull
} from 'sequelize-typescript';

@Table({
  tableName: 'notification_templates',
  timestamps: false // using created_at and updated_at manually
})
export class NotificationTemplate extends Model<NotificationTemplate> {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.BIGINT.UNSIGNED)
  id!: number;

  @AllowNull(true)
  @Column(DataType.STRING(50))
  alias?: string;

  @AllowNull(true)
  @Column(DataType.STRING(255))
  title?: string;

  @AllowNull(true)
  @Column(DataType.STRING(255))
  to_sender?: string;

  @AllowNull(true)
  @Column(DataType.STRING(255))
  to_receiver?: string;

  @Default('1')
  @Column(DataType.ENUM('1', '0'))
  status!: '1' | '0';

  @Default('Default')
  @Column(DataType.ENUM('Trade', 'Offer', 'Shipping', 'Payment', 'Default'))
  set_for!: 'Trade' | 'Offer' | 'Shipping' | 'Payment' | 'Default';

  @AllowNull(true)
  @Column(DataType.DATE)
  created_at?: Date;

  @AllowNull(true)
  @Column(DataType.DATE)
  updated_at?: Date;
}


