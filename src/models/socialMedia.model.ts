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
    HasMany,
} from 'sequelize-typescript';
import { UserSocialMedia } from './userSocialMedia.model.js';

@Table({
    tableName: 'social_medias',
    timestamps: true,
  })
  export class SocialMedia extends Model<SocialMedia> {
    @PrimaryKey
    @AutoIncrement
    @Column({
      type: DataType.BIGINT.UNSIGNED,
    })
    id!: number;
  
    @AllowNull(true)
    @Column(DataType.STRING(255))
    social_media_name!: string | null;
  
    @AllowNull(true)
    @Column(DataType.STRING(255))
    social_media_link!: string | null;
  
    @AllowNull(true)
    @Column(DataType.STRING(255))
    social_media_icon!: string | null;
  
    @AllowNull(false)
    @Default('1')
    @Column(DataType.ENUM('1', '0'))
    social_media_status!: '1' | '0';
  
    @CreatedAt
    @Column({ field: 'created_at', type: DataType.DATE })
    created_at!: Date;
  
    @UpdatedAt
    @Column({ field: 'updated_at', type: DataType.DATE })
    updated_at!: Date;
  
    // Associations
    @HasMany(() => UserSocialMedia)
    userSocialMedias!: UserSocialMedia[];
  }
  