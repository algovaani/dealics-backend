import {
    Table,
    Column,
    Model,
    DataType,
    PrimaryKey,
    AutoIncrement,
    AllowNull,
    Default,
    ForeignKey,
    CreatedAt,
    UpdatedAt,
  } from 'sequelize-typescript';
import { User } from './user.model.js';
import { SocialMedia } from './socialMedia.model.js';
  
  @Table({
    tableName: 'user_social_media',
    timestamps: true,
  })
  export class UserSocialMedia extends Model<UserSocialMedia> {
    @PrimaryKey
    @AutoIncrement
    @Column({
      type: DataType.BIGINT.UNSIGNED,
    })
    id!: number;
  
    @ForeignKey(() => User) // 🔹 requires you to import User model
    @AllowNull(true)
    @Column(DataType.BIGINT)
    user_id!: number | null;
  
    @ForeignKey(() => SocialMedia) // 🔹 requires you to import SocialMedia model
    @AllowNull(true)
    @Column(DataType.BIGINT)
    social_media_id!: number | null;
  
    @AllowNull(true)
    @Column(DataType.STRING(255))
    social_media_url!: string | null;
  
    @AllowNull(false)
    @Default('1')
    @Column(DataType.ENUM('1', '0'))
    social_media_url_status!: '1' | '0';
  
    @CreatedAt
    @Column({ field: 'created_at', type: DataType.DATE })
    created_at!: Date;
  
    @UpdatedAt
    @Column({ field: 'updated_at', type: DataType.DATE })
    updated_at!: Date;
  }
  