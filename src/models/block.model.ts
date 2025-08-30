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
    tableName: "blocks",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  })
  export class Block extends Model<Block> {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.BIGINT.UNSIGNED)
    id!: number;
  
    @AllowNull
    @Column(DataType.STRING(255))
    title?: string;
  
    @AllowNull
    @Column(DataType.STRING(255))
    alias?: string;
  
    @AllowNull
    @Column(DataType.TEXT)
    description?: string;
  }
  