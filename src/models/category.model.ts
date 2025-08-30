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
    tableName: "categories",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  })
  export class Category extends Model<Category> {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    id!: number;
  
    @AllowNull
    @Column(DataType.STRING)
    sport_name?: string;
  
    @AllowNull
    @Column(DataType.STRING)
    slug?: string;
  
    @AllowNull
    @Column(DataType.STRING)
    sport_icon?: string;
  
    @Default("1")
    @Column(DataType.ENUM("1", "0"))
    sport_status!: string;
  
    @Default("0")
    @Column(DataType.ENUM("1", "0"))
    grades_ungraded_status!: string;
  
    @AllowNull
    @Column(DataType.TEXT)
    csv_cols?: string;
  
    @AllowNull
    @Column(DataType.TEXT)
    csv_fields?: string;
  
    @AllowNull
    @Column(DataType.DATE)
    created_at?: Date;
  
    @AllowNull
    @Column(DataType.DATE)
    updated_at?: Date;
  }
  