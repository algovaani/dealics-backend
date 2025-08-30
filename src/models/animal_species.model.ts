import {
    Table,
    Column,
    Model,
    DataType,
    PrimaryKey,
    AutoIncrement,
    AllowNull,
    Default,
  } from "sequelize-typescript";
  
  @Table({
    tableName: "animal_species",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  })
  export class AnimalSpecies extends Model<AnimalSpecies> {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.BIGINT.UNSIGNED)
    id!: number;
  
    @AllowNull
    @Column(DataType.STRING(75))
    name?: string;
  
    @AllowNull
    @Column(DataType.TEXT)
    category_id?: string;
  
    @Default("1")
    @Column(DataType.ENUM("1", "0"))
    status!: "1" | "0"; // 1 = Active, 0 = Inactive
  }
  