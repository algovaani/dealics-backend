import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  AutoIncrement,
  AllowNull,
  ForeignKey,
} from "sequelize-typescript";

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

  @AllowNull
  @Column(DataType.BOOLEAN)
  mark_for_popup?: boolean;

  @AllowNull
  @Column(DataType.BOOLEAN)
  show_on_detail?: boolean;

  // Virtual properties for associations (will be populated by Sequelize)
  fieldCategory?: any;
  item_column?: any;
}


