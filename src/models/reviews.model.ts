import {
    Table,
    Column,
    Model,
    DataType,
    PrimaryKey,
    AutoIncrement,
    CreatedAt,
    UpdatedAt,
    Default,
  } from "sequelize-typescript";
  
  @Table({
    tableName: "reviews",
    timestamps: true,
  })
  export class Review extends Model<Review> {
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
    trade_proposal_id?: number;
  
    @Column({
      type: DataType.BIGINT,
      allowNull: true,
    })
    trader_id?: number;
  
    @Column({
      type: DataType.BIGINT,
      allowNull: true,
    })
    user_id?: number;
  
    @Column({
      type: DataType.BIGINT,
      allowNull: true,
    })
    card_id?: number;
  
    @Column({
      type: DataType.BIGINT,
      allowNull: true,
    })
    order_id?: number;
  
    @Column({
      type: DataType.DOUBLE,
      allowNull: true,
    })
    trader_rating?: number;
  
    @Column({
      type: DataType.TEXT,
      allowNull: true,
    })
    trader_review?: string;
  
    @Column({
      type: DataType.DOUBLE,
      allowNull: true,
    })
    user_rating?: number;
  
    @Column({
      type: DataType.TEXT,
      allowNull: true,
    })
    user_review?: string;
  
    @Default("1")
    @Column({
      type: DataType.ENUM("1", "0"),
      allowNull: false,
    })
    review_status!: "1" | "0";
  
    @CreatedAt
    @Column({
      field: "created_at",
      type: DataType.DATE,
    })
    created_at!: Date;
  
    @UpdatedAt
    @Column({
      field: "updated_at",
      type: DataType.DATE,
    })
    updated_at!: Date;
  }
  