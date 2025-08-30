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
    tableName: 'eras',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  })
  export class Era extends Model<Era> {
    @PrimaryKey
    @AutoIncrement
    @Column({
      type: DataType.BIGINT.UNSIGNED,
    })
    id!: number;
  
    @Column({
      type: DataType.STRING(75),
      allowNull: true,
    })
    name!: string | null;
  
    @Column({
      type: DataType.TEXT,
      allowNull: true,
    })
    category_id!: string | null;
  
    @Column({
      type: DataType.ENUM('1', '0'),
      allowNull: false,
      defaultValue: '1',
    })
    status!: '1' | '0';
  
    @CreatedAt
    @Column({
      type: DataType.DATE,
    })
    created_at!: Date;
  
    @UpdatedAt
    @Column({
      type: DataType.DATE,
    })
    updated_at!: Date;
  }
  