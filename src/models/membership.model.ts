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
  tableName: 'membership',
  timestamps: true, // createdAt & updatedAt Sequelize manage karega
})
export class Membership extends Model<Membership> {
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
  title?: string;

  @Column({
    type: DataType.DOUBLE,
    allowNull: true,
  })
  price?: number;

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
