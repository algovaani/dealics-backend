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
    tableName: 'certifications',
    timestamps: true,
  })
  export class Certification extends Model<Certification> {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.BIGINT.UNSIGNED)
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
    category_id!: string | null; // Storing text (could be CSV or JSON string)
  
    @Column({
      type: DataType.ENUM('1', '0'),
      allowNull: false,
      defaultValue: '1',
    })
    status!: '1' | '0';
  
    @CreatedAt
    @Column({ field: 'created_at', type: DataType.DATE })
    created_at!: Date;
  
    @UpdatedAt
    @Column({ field: 'updated_at', type: DataType.DATE })
    updated_at!: Date;
  }
  