import {
    Table,
    Column,
    Model,
    DataType,
    PrimaryKey,
    AutoIncrement,
    CreatedAt,
  } from 'sequelize-typescript';
  
  @Table({
    tableName: 'failed_jobs',
    timestamps: false, // since we have only failed_at
  })
  export class FailedJob extends Model<FailedJob> {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.BIGINT.UNSIGNED)
    id!: number;
  
    @Column({
      type: DataType.STRING(255),
      allowNull: false,
    })
    uuid!: string;
  
    @Column({
      type: DataType.TEXT,
      allowNull: false,
    })
    connection!: string;
  
    @Column({
      type: DataType.TEXT,
      allowNull: false,
    })
    queue!: string;
  
    @Column({
      type: DataType.TEXT('long'),
      allowNull: false,
    })
    payload!: string;
  
    @Column({
      type: DataType.TEXT('long'),
      allowNull: false,
    })
    exception!: string;
  
    @CreatedAt
    @Column({
      type: DataType.DATE,
      field: 'failed_at',
      defaultValue: DataType.NOW,
    })
    failedAt!: Date;
  }
  