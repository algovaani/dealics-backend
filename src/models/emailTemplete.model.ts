import {
    Table,
    Column,
    Model,
    DataType,
    PrimaryKey,
    AutoIncrement,
    CreatedAt,
    UpdatedAt,
    AllowNull,
    Default,
  } from 'sequelize-typescript';
  
  @Table({
    tableName: 'email_templetes',
    timestamps: true, // will auto map createdAt & updatedAt
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  })
  export class EmailTemplete extends Model<EmailTemplete> {
    @PrimaryKey
    @AutoIncrement
    @Column({
      type: DataType.BIGINT.UNSIGNED,
    })
    id!: number;
  
    @AllowNull(true)
    @Column({
      type: DataType.STRING(50),
    })
    alias?: string;
  
    @AllowNull(true)
    @Column({
      type: DataType.STRING(255),
    })
    email_subject?: string;
  
    @AllowNull(true)
    @Column({
      type: DataType.TEXT,
    })
    email_description?: string;
  
    @AllowNull(true)
    @Column({
      type: DataType.STRING(255),
    })
    email_from?: string;
  
    @AllowNull(true)
    @Column({
      type: DataType.STRING(50),
    })
    email_from_name?: string;
  
    @AllowNull(true)
    @Column({
      type: DataType.STRING(255),
    })
    email_to?: string;
  
    @AllowNull(true)
    @Column({
      type: DataType.STRING(255),
    })
    email_cc?: string;
  
    @AllowNull(true)
    @Column({
      type: DataType.STRING(255),
    })
    email_bcc?: string;
  
    @Default('0')
    @Column({
      type: DataType.ENUM('1', '0'),
    })
    email_status!: '1' | '0';
  
    @CreatedAt
    @Column({
      field: 'created_at',
      type: DataType.DATE,
    })
    created_at!: Date;
  
    @UpdatedAt
    @Column({
      field: 'updated_at',
      type: DataType.DATE,
    })
    updated_at!: Date;
  }
  