import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  AutoIncrement,
  AllowNull,
  Default
} from "sequelize-typescript";

@Table({
  tableName: "sizes",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: "updated_at",
})
export class Size extends Model<Size> {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.BIGINT.UNSIGNED)
  id!: number;

  @AllowNull
  @Column(DataType.STRING(75))
  name?: string;

  @AllowNull
  @Column(DataType.TEXT)
  category_id?: string;

  @Default("1")
  @Column(DataType.ENUM("1", "0"))
  status!: string;

  @AllowNull
  @Column(DataType.DATE)
  created_at?: Date;

  @AllowNull
  @Column(DataType.DATE)
  updated_at?: Date;
}
