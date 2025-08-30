import {
    Table,
    Column,
    Model,
    DataType,
    PrimaryKey,
    AutoIncrement,
    AllowNull,
  } from "sequelize-typescript";
  
  @Table({
    tableName: "blog_tags",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  })
  export class BlogTag extends Model<BlogTag> {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.BIGINT.UNSIGNED)
    id!: number;
  
    @AllowNull
    @Column(DataType.BIGINT)
    blog_id?: number;
  
    @AllowNull
    @Column(DataType.BIGINT)
    tag_id?: number;
  }
  