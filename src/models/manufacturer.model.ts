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
  tableName: "manufacturers",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: "updated_at",
})
export class Manufacturer extends Model<Manufacturer> {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.BIGINT.UNSIGNED)
  id!: number;

  @AllowNull
  @Column(DataType.STRING(255))
  manufacturer_name?: string;

  @AllowNull
  @Column(DataType.TEXT)
  category_id?: string;

  @Default("1")
  @Column(DataType.ENUM("1", "0"))
  manufacturer_status!: "1" | "0"; // 1 = Active, 0 = Inactive
}
