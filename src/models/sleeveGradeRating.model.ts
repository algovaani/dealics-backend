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
    tableName: 'sleeve_grade_ratings',
    timestamps: true, // createdAt और updatedAt अपने आप manage होंगे
  })
  export class SleeveGradeRating extends Model<SleeveGradeRating> {
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
    name?: string;
  
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
      field: 'created_at',
      type: DataType.DATE,
    })
    createdAt?: Date;
  
    @UpdatedAt
    @Column({
      field: 'updated_at',
      type: DataType.DATE,
    })
    updatedAt?: Date;
  }
  