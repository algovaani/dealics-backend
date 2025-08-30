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
    tableName: 'followers',
    timestamps: true, // since you already have created_at & updated_at
    underscored: true, // maps createdAt -> created_at, updatedAt -> updated_at
  })
  export class Follower extends Model<Follower> {
    @PrimaryKey
    @AutoIncrement
    @Column({
      type: DataType.BIGINT.UNSIGNED,
    })
    id!: number;
  
    @AllowNull(true)
    @Column({
      type: DataType.BIGINT,
    })
    trader_id!: number | null;
  
    @AllowNull(true)
    @Column({
      type: DataType.BIGINT,
    })
    user_id!: number | null;
  
    @Default('1')
    @Column({
      type: DataType.ENUM('1', '0'),
    })
    follower_status!: '1' | '0';
  
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
  