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
  } from 'sequelize-typescript';
  
  @Table({
    tableName: 'console_brands',
    timestamps: true, // because you have created_at & updated_at
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  })
  export class ConsoleBrand extends Model<ConsoleBrand> {
    @PrimaryKey
    @AutoIncrement
    @Column({
      type: DataType.BIGINT.UNSIGNED,
    })
    id!: number;
  
    @AllowNull(true)
    @Column({
      type: DataType.STRING(75),
    })
    name?: string;
  
    @AllowNull(true)
    @Column({
      type: DataType.TEXT,
    })
    category_id?: string;
  
    @Default('1')
    @Column({
      type: DataType.ENUM('1', '0'),
    })
    status!: '1' | '0';
  
    @CreatedAt
    @Column({
      type: DataType.DATE,
    })
    created_at?: Date;
  
    @UpdatedAt
    @Column({
      type: DataType.DATE,
    })
    updated_at?: Date;
  }
  