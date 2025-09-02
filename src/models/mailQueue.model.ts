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
    tableName: "mail_queues",
    timestamps: true,
    underscored: true,
  })
  export class MailQueue extends Model<MailQueue> {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.BIGINT.UNSIGNED)
    id!: number;
  
    @AllowNull(true)
    @Column(DataType.STRING(100))
    mail_title?: string;
  
    @AllowNull(true)
    @Column(DataType.STRING(75))
    mail_from?: string;
  
    @AllowNull(true)
    @Column(DataType.STRING(50))
    mail_from_name?: string;
  
    @AllowNull(true)
    @Column(DataType.STRING(100))
    mail_to?: string;
  
    @AllowNull(true)
    @Column(DataType.TEXT)
    mail_subject?: string;
  
    @AllowNull(true)
    @Column(DataType.TEXT)
    mail_body?: string;
  
    @AllowNull(false)
    @Default(0)
    @Column(DataType.TINYINT)
    status!: number; // 0 = pending, 1 = not send
  
    @CreatedAt
    @Column({ field: "created_at", type: DataType.DATE })
    created_at!: Date;
  
    @UpdatedAt
    @Column({ field: "updated_at", type: DataType.DATE })
    updated_at!: Date;
  }
  