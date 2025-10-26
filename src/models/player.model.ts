import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement, AllowNull, Default } from 'sequelize-typescript';

@Table({
  tableName: 'players',
  timestamps: true,
  underscored: true, // created_at/updated_at
})
export class Player extends Model<Player> {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.BIGINT.UNSIGNED)
  id!: number;

  @AllowNull
  @Column(DataType.STRING(255))
  player_name?: string;

  @AllowNull
  @Column(DataType.TEXT)
  category_id?: string;

  @Default('1')
  @Column(DataType.ENUM('1', '0'))
  player_status!: '1' | '0';

  @AllowNull
  @Column(DataType.DATE)
  created_at?: Date;

  @AllowNull
  @Column(DataType.DATE)
  updated_at?: Date;
}


