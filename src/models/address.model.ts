import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  AutoIncrement,
  AllowNull,
  Default,
} from "sequelize-typescript";

@Table({
  tableName: "addresses",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: "updated_at",
})
export class Address extends Model<Address> {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.BIGINT.UNSIGNED)
  id!: number;

  @Column(DataType.BIGINT.UNSIGNED)
  user_id!: number;

  @Column(DataType.STRING(255))
  name!: string;

  @Column(DataType.STRING(255))
  phone!: string;

  @Column(DataType.STRING(255))
  email!: string;

  @Column(DataType.STRING(255))
  street1!: string;

  @AllowNull
  @Column(DataType.STRING(255))
  street2?: string;

  @Column(DataType.STRING(255))
  city!: string;

  @Column(DataType.STRING(255))
  state!: string;

  @Column(DataType.STRING(255))
  country!: string;

  @Column(DataType.STRING(255))
  zip!: string;

  @Default("0")
  @Column(DataType.ENUM("0", "1"))
  is_sender!: "0" | "1"; // 0 = Receiver, 1 = Sender

  @Default("0")
  @Column(DataType.ENUM("0", "1"))
  is_deleted!: "0" | "1"; // 0 = Not Deleted, 1 = Deleted

  @AllowNull
  @Column(DataType.DOUBLE)
  latitude?: number;

  @AllowNull
  @Column(DataType.DOUBLE)
  longitude?: number;

  @AllowNull
  @Column(DataType.STRING(255))
  adr_id?: string;

  @Default(2)
  @Column(DataType.TINYINT)
  mark_default!: number;
}
