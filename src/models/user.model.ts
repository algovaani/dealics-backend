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
    tableName: "users",   // ✅ आपके DB का table नाम
    timestamps: true,     // क्योंकि created_at, updated_at हैं
    createdAt: "created_at",
    updatedAt: "updated_at",
  })
  export class User extends Model<User> {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    id!: number;
  
    @Default(0)
    @Column(DataType.BOOLEAN)
    is_demo!: boolean;
  
    @AllowNull
    @Column(DataType.STRING)
    first_name?: string;
  
    @AllowNull
    @Column(DataType.STRING)
    last_name?: string;
  
    @AllowNull
    @Column(DataType.STRING)
    username?: string;
  
    @AllowNull
    @Column(DataType.STRING)
    profile_picture?: string;
  
    @AllowNull
    @Column(DataType.STRING)
    email?: string;
  
    @Default("0")
    @Column(DataType.ENUM("1", "0"))
    is_email_verified!: string;
  
    @AllowNull
    @Column(DataType.DATE)
    email_verified_at?: Date;
  
    @AllowNull
    @Column(DataType.STRING)
    password?: string;

    @AllowNull
    @Column(DataType.STRING)
    recover_password_token?: string;
  
    @AllowNull
    @Column(DataType.TEXT)
    two_factor_secret?: string;
  
    @AllowNull
    @Column(DataType.TEXT)
    two_factor_recovery_codes?: string;
  
    @AllowNull
    @Column(DataType.DATE)
    two_factor_confirmed_at?: Date;
  
    @AllowNull
    @Column(DataType.STRING)
    ebay_store_url?: string;
  
    @Default("0")
    @Column(DataType.ENUM("1", "0"))
    is_ebay_store_verified!: string;
  
    @AllowNull
    @Column(DataType.DATE)
    ebay_store_verified_at?: Date;
  
    @AllowNull
    @Column(DataType.STRING(10))
    country_code?: string;
  
    @AllowNull
    @Column(DataType.STRING(20))
    phone_number?: string;
  
    @AllowNull
    @Column(DataType.TEXT)
    about_user?: string;
  
    @AllowNull
    @Column(DataType.TEXT)
    bio?: string;
  
    @AllowNull
    @Column(DataType.STRING)
    shipping_address?: string;
  
    @AllowNull
    @Column(DataType.STRING)
    shipping_city?: string;
  
    @AllowNull
    @Column(DataType.STRING)
    shipping_state?: string;
  
         @AllowNull
     @Column(DataType.INTEGER)
     shipping_zip_code?: number;
  
    @Default("1")
    @Column(DataType.ENUM("1", "0"))
    user_status!: string;
  
    @Default("user")
    @Column(DataType.ENUM("admin", "user"))
    user_role!: string;
  
    @AllowNull
    @Column(DataType.STRING(100))
    remember_token?: string;
  
         @AllowNull
     @Column(DataType.INTEGER)
     current_team_id?: number;
  
    @AllowNull
    @Column(DataType.STRING(2048))
    profile_photo_path?: string;
  
    @Default(0)
    @Column(DataType.BOOLEAN)
    gmail_login!: boolean;
  
    @Default(0)
    @Column(DataType.BOOLEAN)
    is_veteran_user!: boolean;
  
    @AllowNull
    @Column(DataType.INTEGER)
    cxp_coins?: number;

    @AllowNull
    @Column(DataType.INTEGER)
    credit?: number;
  
    @AllowNull
    @Column(DataType.STRING(3))
    ratings?: string;
  
    @AllowNull
    @Column(DataType.INTEGER)
    followers?: number;
  
    @AllowNull
    @Column(DataType.INTEGER)
    trade_transactions?: number;
  
    @AllowNull
    @Column(DataType.INTEGER)
    trading_cards?: number;
  
    @AllowNull
    @Column(DataType.STRING(100))
    paypal_business_email?: string;
  
    @Default(0)
    @Column(DataType.BOOLEAN)
    is_free_shipping!: boolean;
  
    @AllowNull
    @Column(DataType.DOUBLE)
    shipping_flat_rate?: number;
  
    @AllowNull
    @Column(DataType.DOUBLE)
    add_product_shipping_flat_rate?: number;
  }
  