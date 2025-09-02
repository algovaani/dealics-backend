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
    tableName: "settings",
    timestamps: true,
    underscored: true,
  })
  export class Setting extends Model<Setting> {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    id!: number;
  
    @AllowNull(false)
    @Column(DataType.INTEGER)
    user_id!: number;
  
    @AllowNull(true)
    @Column(DataType.STRING(255))
    logo?: string;
  
    @AllowNull(true)
    @Column(DataType.STRING(255))
    sitename?: string;
  
    @AllowNull(true)
    @Column(DataType.TEXT)
    site_slogan?: string;
  
    @AllowNull(true)
    @Column(DataType.TEXT)
    copyright_text?: string;
  
    @AllowNull(true)
    @Column(DataType.STRING(255))
    contact_us_mail?: string;
  
    @AllowNull(true)
    @Column(DataType.STRING(250))
    contact_us_phone?: string;
  
    @AllowNull(true)
    @Column(DataType.INTEGER)
    decline_timer?: number;
  
    @AllowNull(false)
    @Default(0)
    @Column(DataType.TINYINT)
    mail_sent!: number;
  
    @CreatedAt
    @Default(DataType.NOW)
    @Column({ field: "created_at", type: DataType.DATE })
    created_at!: Date;
  
    @UpdatedAt
    @Default(DataType.NOW)
    @Column({ field: "updated_at", type: DataType.DATE })
    updated_at!: Date;
  }
  