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

export interface IMembershipUser {
  id: number;
  user_id?: number;
  membership_id?: number;
  expired_date?: string;
  type: 'Free' | 'Pro Collector';
  status: '1' | '0';
  createdAt?: Date;
  updatedAt?: Date;
  membership?: any; // This will be typed as the Membership model
}

@Table({
  tableName: 'membership_user',
  timestamps: true,
})
export class MembershipUser extends Model<IMembershipUser> {
  @PrimaryKey
  @AutoIncrement
  @Column({
    type: DataType.BIGINT.UNSIGNED,
  })
  id!: number;

  @Column({
    type: DataType.BIGINT,
    allowNull: true,
  })
  user_id?: number;

  @Column({
    type: DataType.BIGINT,
    allowNull: true,
  })
  membership_id?: number;

   @Column({
    type: DataType.BIGINT,
    allowNull: true,
  })
  transaction_id?: number;

  @Column({
    type: DataType.DATEONLY, // SQL 'date' type ke liye
    allowNull: true,
  })
  expired_date?: string;

  @Column({
    type: DataType.ENUM('Free', 'Pro Collector'),
    allowNull: false,
    defaultValue: 'Free',
  })
  type!: 'Free' | 'Pro Collector';

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
