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
    tableName: 'professional_graders',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  })
  export class ProfessionalGrader extends Model<ProfessionalGrader> {
    @PrimaryKey
    @AutoIncrement
    @Column({
      type: DataType.BIGINT.UNSIGNED,
    })
    id!: number;
  
    @Column({
      type: DataType.STRING(255),
      allowNull: true,
    })
    professional_grader_name?: string;
  
    @Column({
      type: DataType.STRING(255),
      allowNull: true,
    })
    professional_grader_short_name?: string;
  
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
    professional_grader_status!: '1' | '0';
  
    @Column({
      type: DataType.STRING(255),
      allowNull: true,
    })
    certification_url?: string;
  
    @CreatedAt
    @Column({ field: 'created_at' })
    created_at?: Date;
  
    @UpdatedAt
    @Column({ field: 'updated_at' })
    updated_at?: Date;
  }
  