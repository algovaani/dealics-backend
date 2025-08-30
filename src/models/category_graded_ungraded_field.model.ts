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
  tableName: "category_graded_ungraded_fields",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: "updated_at",
})
export class CategoryGradedUngradedField extends Model<CategoryGradedUngradedField> {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.BIGINT.UNSIGNED)
  id!: number;

  @AllowNull
  @Column(DataType.BIGINT.UNSIGNED)
  category_id?: number;

  @AllowNull
  @Column(DataType.TEXT)
  fields?: string;

  @Default(0)
  @Column(DataType.BOOLEAN)
  is_graded!: boolean;

  @Default(0)
  @Column(DataType.BOOLEAN)
  is_ungraded!: boolean;
}
