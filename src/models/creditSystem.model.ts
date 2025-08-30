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
    tableName: 'credit_systems',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  })
  export class CreditSystem extends Model<CreditSystem> {
    @PrimaryKey
    @AutoIncrement
    @Column({
      type: DataType.BIGINT.UNSIGNED,
      allowNull: false,
    })
    id!: number;
  
    @Column({
      type: DataType.INTEGER,
      allowNull: true,
    })
    coin_from!: number | null;
  
    @Column({
      type: DataType.INTEGER,
      allowNull: true,
    })
    coin_to!: number | null;
  
    @Column({
      type: DataType.DECIMAL(12, 2),
      allowNull: true,
    })
    amount!: number | null;
  
    @Column({
      type: DataType.STRING(50),
      allowNull: true,
    })
    discount!: string | null;
  
    @Column({
      type: DataType.TINYINT,
      allowNull: false,
      defaultValue: 1,
    })
    status!: number;
  
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
  