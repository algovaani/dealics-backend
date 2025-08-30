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
  tableName: "sliders",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: "updated_at",
})
export class Slider extends Model<Slider> {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.BIGINT.UNSIGNED)
  id!: number;

  @AllowNull
  @Column(DataType.STRING(255))
  title?: string;

  @AllowNull
  @Column(DataType.STRING(255))
  image?: string;

  @AllowNull
  @Column(DataType.STRING(255))
  mobile_image?: string;

  @Default("1")
  @Column(DataType.ENUM("1", "0"))
  status!: "1" | "0"; // 1 = Active, 0 = Inactive
}
