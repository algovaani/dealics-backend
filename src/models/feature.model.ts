import {
    Table,
    Column,
    Model,
    DataType,
    PrimaryKey,
    AutoIncrement,
    CreatedAt,
    UpdatedAt,
    AllowNull,
    Default
  } from 'sequelize-typescript';
  
  @Table({
    tableName: 'features',
    timestamps: true, // enables createdAt & updatedAt
    underscored: true
  })
  export class Feature extends Model<Feature> {
    @PrimaryKey
    @AutoIncrement
    @Column({
      type: DataType.BIGINT.UNSIGNED
    })
    id!: number;
  
    @AllowNull(true)
    @Column({
      type: DataType.STRING(75)
    })
    name?: string;
  
    @AllowNull(true)
    @Column({
      type: DataType.TEXT
    })
    category_id?: string;
  
    @Default('1')
    @Column({
      type: DataType.ENUM('1', '0'),
      comment: '1 = Active, 0 = Inactive'
    })
    status!: string;
  
    @CreatedAt
    @Column({
      field: 'created_at',
      type: DataType.DATE
    })
    created_at?: Date;
  
    @UpdatedAt
    @Column({
      field: 'updated_at',
      type: DataType.DATE
    })
    updated_at?: Date;
  }
  