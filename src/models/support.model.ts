import {
    Table,
    Column,
    Model,
    DataType,
    PrimaryKey,
    AutoIncrement,
    CreatedAt,
    UpdatedAt,
    Default,
  } from "sequelize-typescript";
  
  @Table({
    tableName: "support",
    timestamps: true,
  })
  export class Support extends Model<Support> {
    @PrimaryKey
    @AutoIncrement
    @Column({
      type: DataType.BIGINT.UNSIGNED,
    })
    id!: number;
  
    @Column({
      type: DataType.BIGINT,
      allowNull: true,
    })
    user_id?: number;
  
    @Column({
      type: DataType.STRING,
      allowNull: true,
    })
    first_name?: string;
  
    @Column({
      type: DataType.STRING,
      allowNull: true,
    })
    last_name?: string;
  
    @Column({
      type: DataType.STRING,
      allowNull: true,
    })
    email?: string;
  
    @Column({
      type: DataType.STRING,
      allowNull: true,
    })
    subject?: string;
  
    @Column({
      type: DataType.TEXT,
      allowNull: true,
    })
    comment?: string;
  
    @Default("New")
    @Column({
      type: DataType.ENUM("New", "Resolved", "On Hold"),
      allowNull: false,
    })
    support_request_status!: "New" | "Resolved" | "On Hold";
  
    @Default("1")
    @Column({
      type: DataType.ENUM("1", "0"),
      allowNull: false,
    })
    support_status!: "1" | "0";
  
    @CreatedAt
    @Column({
      field: "created_at",
      type: DataType.DATE,
    })
    created_at!: Date;
  
    @UpdatedAt
    @Column({
      field: "updated_at",
      type: DataType.DATE,
    })
    updated_at!: Date;
  }
  