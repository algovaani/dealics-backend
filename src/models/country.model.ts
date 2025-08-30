import {
    Table,
    Column,
    Model,
    DataType,
    PrimaryKey,
    AutoIncrement,
    CreatedAt,
    UpdatedAt,
  } from 'sequelize-typescript';
  
  @Table({
    tableName: 'countries',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  })
  export class Country extends Model<Country> {
    @PrimaryKey
    @AutoIncrement
    @Column({
      type: DataType.INTEGER,
      allowNull: false,
    })
    id!: number;
  
    @Column({
      type: DataType.STRING(100),
      allowNull: false,
    })
    name!: string;
  
    @Column({
      type: DataType.TEXT,
      allowNull: true,
    })
    category_id?: string;
  
    @Column({
      type: DataType.ENUM('1', '0'),
      allowNull: false,
      defaultValue: '1',
    })
    status!: '1' | '0';
  
    @CreatedAt
    @Column({
      type: DataType.DATE,
      field: 'created_at',
    })
    created_at?: Date;
  
    @UpdatedAt
    @Column({
      type: DataType.DATE,
      field: 'updated_at',
    })
    updated_at?: Date;
  }
  