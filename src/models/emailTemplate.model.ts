import {
    Table,
    Column,
    Model,
    DataType,
    PrimaryKey,
    AutoIncrement,
    AllowNull,
    Default,
    CreatedAt,
    UpdatedAt,
  } from "sequelize-typescript";
  
  @Table({
    tableName: "email_templetes",
    timestamps: true, // because we have created_at and updated_at
    underscored: true, // matches snake_case fields
  })
  export class EmailTemplete extends Model<EmailTemplete> {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.BIGINT.UNSIGNED)
    id!: number;
  
    @AllowNull(true)
    @Column(DataType.STRING(50))
    alias?: string;
  
    @AllowNull(true)
    @Column(DataType.STRING(255))
    email_subject?: string;
  
    @AllowNull(true)
    @Column(DataType.TEXT)
    email_description?: string;
  
    @AllowNull(true)
    @Column(DataType.STRING(255))
    email_from?: string;
  
    @AllowNull(true)
    @Column(DataType.STRING(50))
    email_from_name?: string;
  
    @AllowNull(true)
    @Column(DataType.STRING(255))
    email_to?: string;
  
    @AllowNull(true)
    @Column(DataType.STRING(255))
    email_cc?: string;
  
    @AllowNull(true)
    @Column(DataType.STRING(255))
    email_bcc?: string;
  
    @Default("0")
    @Column(DataType.ENUM("1", "0"))
    email_status!: "1" | "0";
  
    @CreatedAt
    @Column({ field: "created_at", type: DataType.DATE })
    created_at!: Date;
  
    @UpdatedAt
    @Column({ field: "updated_at", type: DataType.DATE })
    updated_at!: Date;
  }
  