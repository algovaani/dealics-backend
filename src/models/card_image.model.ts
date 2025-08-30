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
    ForeignKey
  } from 'sequelize-typescript';
  
  @Table({
    tableName: 'card_images',
    timestamps: true, // will use createdAt and updatedAt
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  })
  export class CardImage extends Model<CardImage> {
    @PrimaryKey
    @AutoIncrement
    @Column({
      type: DataType.BIGINT.UNSIGNED
    })
    id!: number;
  
    @AllowNull(true)
    @Column({
      type: DataType.BIGINT.UNSIGNED,
      field: 'main_card_id'
    })
    mainCardId?: number;
  
    @AllowNull(true)
    @Column({
      type: DataType.BIGINT.UNSIGNED,
      field: 'trader_id'
    })
    traderId?: number;
  
    @AllowNull(true)
    @Column({
      type: DataType.STRING(255),
      field: 'card_image_1'
    })
    cardImage1?: string;
  
    @AllowNull(true)
    @Column({
      type: DataType.STRING(255),
      field: 'card_image_2'
    })
    cardImage2?: string;
  
    @AllowNull(true)
    @Column({
      type: DataType.STRING(255),
      field: 'card_image_3'
    })
    cardImage3?: string;
  
    @AllowNull(true)
    @Column({
      type: DataType.STRING(255),
      field: 'card_image_4'
    })
    cardImage4?: string;
  
    @Default('1')
    @Column({
      type: DataType.ENUM('1', '0'),
      field: 'card_image_status'
    })
    cardImageStatus!: '1' | '0';
  
    @CreatedAt
    @Column({
      field: 'created_at'
    })
    createdAt!: Date;
  
    @UpdatedAt
    @Column({
      field: 'updated_at'
    })
    updatedAt!: Date;
  }
  