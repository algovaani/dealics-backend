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
    tableName: 'record_graders',
    timestamps: true, // since created_at and updated_at exist
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  })
  export class RecordGrader extends Model<RecordGrader> {
    @PrimaryKey
    @AutoIncrement
    @Column({
      type: DataType.BIGINT,
      allowNull: false,
    })
    id!: number;
  
    @Column({
      type: DataType.STRING(255),
      allowNull: true,
    })
    name!: string | null;
  
    @Column({
      type: DataType.STRING(255),
      allowNull: true,
    })
    short_name!: string | null;
  
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
      field: 'created_at',
    })
    created_at!: Date;
  
    @UpdatedAt
    @Column({
      type: DataType.DATE,
      field: 'updated_at',
    })
    updated_at!: Date;
  }
  