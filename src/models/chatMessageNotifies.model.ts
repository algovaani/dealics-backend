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
    tableName: 'chat_message_notifies',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  })
  export class ChatMessageNotify extends Model<ChatMessageNotify> {
    @PrimaryKey
    @AutoIncrement
    @Column({
      type: DataType.BIGINT.UNSIGNED,
    })
    id!: number;
  
    @Column({
      type: DataType.BIGINT,
      allowNull: true,
    })
    chat_id!: number | null;
  
    @Column({
      type: DataType.BIGINT,
      allowNull: true,
    })
    user_id!: number | null;
  
    @Column({
      type: DataType.BIGINT,
      allowNull: true,
    })
    thread!: number | null;
  
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
    created_at!: Date;
  
    @UpdatedAt
    @Column({
      field: 'updated_at',
      type: DataType.DATE,
    })
    updated_at!: Date;
  }
  