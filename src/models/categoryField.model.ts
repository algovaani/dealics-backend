import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  AutoIncrement,
  AllowNull,
  ForeignKey,
  BelongsTo,
} from "sequelize-typescript";
import { Category } from "./category.model.js";

@Table({
  tableName: "category_fields",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: "updated_at",
})
export class CategoryField extends Model<CategoryField> {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  id!: number;

  @ForeignKey(() => Category)
  @AllowNull
  @Column(DataType.INTEGER)
  category_id?: number;

  @AllowNull
  @Column(DataType.STRING)
  fields?: string;

  @AllowNull
  @Column(DataType.BOOLEAN)
  is_required?: boolean;

  @AllowNull
  @Column(DataType.TEXT)
  additional_information?: string;

  @AllowNull
  @Column(DataType.INTEGER)
  priority?: number;

  @AllowNull
  @Column(DataType.BOOLEAN)
  mark_as_title?: boolean;

  @BelongsTo(() => Category)
  category?: Category;
}
