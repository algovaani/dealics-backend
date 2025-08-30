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
    tableName: 'convention_events',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  })
  export class ConventionEvent extends Model<ConventionEvent> {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.BIGINT.UNSIGNED)
    id!: number;
  
    @AllowNull(true)
    @Column(DataType.STRING(75))
    name!: string | null;
  
    @AllowNull(true)
    @Column(DataType.TEXT)
    category_id!: string | null;
  
    @AllowNull(false)
    @Default('1')
    @Column(DataType.ENUM('1', '0'))
    status!: '1' | '0';
  
    @CreatedAt
    @Column(DataType.DATE)
    created_at!: Date;
  
    @UpdatedAt
    @Column(DataType.DATE)
    updated_at!: Date;
  }
  