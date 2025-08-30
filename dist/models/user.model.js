var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement, AllowNull, Default, } from "sequelize-typescript";
let User = class User extends Model {
};
__decorate([
    PrimaryKey,
    AutoIncrement,
    Column(DataType.INTEGER),
    __metadata("design:type", Number)
], User.prototype, "id", void 0);
__decorate([
    Default(0),
    Column(DataType.BOOLEAN),
    __metadata("design:type", Boolean)
], User.prototype, "is_demo", void 0);
__decorate([
    AllowNull,
    Column(DataType.STRING),
    __metadata("design:type", String)
], User.prototype, "first_name", void 0);
__decorate([
    AllowNull,
    Column(DataType.STRING),
    __metadata("design:type", String)
], User.prototype, "last_name", void 0);
__decorate([
    AllowNull,
    Column(DataType.STRING),
    __metadata("design:type", String)
], User.prototype, "username", void 0);
__decorate([
    AllowNull,
    Column(DataType.STRING),
    __metadata("design:type", String)
], User.prototype, "profile_picture", void 0);
__decorate([
    AllowNull,
    Column(DataType.STRING),
    __metadata("design:type", String)
], User.prototype, "email", void 0);
__decorate([
    Default("0"),
    Column(DataType.ENUM("1", "0")),
    __metadata("design:type", String)
], User.prototype, "is_email_verified", void 0);
__decorate([
    AllowNull,
    Column(DataType.DATE),
    __metadata("design:type", Date)
], User.prototype, "email_verified_at", void 0);
__decorate([
    AllowNull,
    Column(DataType.STRING),
    __metadata("design:type", String)
], User.prototype, "password", void 0);
__decorate([
    AllowNull,
    Column(DataType.TEXT),
    __metadata("design:type", String)
], User.prototype, "two_factor_secret", void 0);
__decorate([
    AllowNull,
    Column(DataType.TEXT),
    __metadata("design:type", String)
], User.prototype, "two_factor_recovery_codes", void 0);
__decorate([
    AllowNull,
    Column(DataType.DATE),
    __metadata("design:type", Date)
], User.prototype, "two_factor_confirmed_at", void 0);
__decorate([
    AllowNull,
    Column(DataType.STRING),
    __metadata("design:type", String)
], User.prototype, "ebay_store_url", void 0);
__decorate([
    Default("0"),
    Column(DataType.ENUM("1", "0")),
    __metadata("design:type", String)
], User.prototype, "is_ebay_store_verified", void 0);
__decorate([
    AllowNull,
    Column(DataType.DATE),
    __metadata("design:type", Date)
], User.prototype, "ebay_store_verified_at", void 0);
__decorate([
    AllowNull,
    Column(DataType.STRING(10)),
    __metadata("design:type", String)
], User.prototype, "country_code", void 0);
__decorate([
    AllowNull,
    Column(DataType.STRING(20)),
    __metadata("design:type", String)
], User.prototype, "phone_number", void 0);
__decorate([
    AllowNull,
    Column(DataType.TEXT),
    __metadata("design:type", String)
], User.prototype, "about_user", void 0);
__decorate([
    AllowNull,
    Column(DataType.TEXT),
    __metadata("design:type", String)
], User.prototype, "bio", void 0);
__decorate([
    AllowNull,
    Column(DataType.STRING),
    __metadata("design:type", String)
], User.prototype, "shipping_address", void 0);
__decorate([
    AllowNull,
    Column(DataType.STRING),
    __metadata("design:type", String)
], User.prototype, "shipping_city", void 0);
__decorate([
    AllowNull,
    Column(DataType.STRING),
    __metadata("design:type", String)
], User.prototype, "shipping_state", void 0);
__decorate([
    AllowNull,
    Column(DataType.INTEGER),
    __metadata("design:type", Number)
], User.prototype, "shipping_zip_code", void 0);
__decorate([
    Default("1"),
    Column(DataType.ENUM("1", "0")),
    __metadata("design:type", String)
], User.prototype, "user_status", void 0);
__decorate([
    Default("user"),
    Column(DataType.ENUM("admin", "user")),
    __metadata("design:type", String)
], User.prototype, "user_role", void 0);
__decorate([
    AllowNull,
    Column(DataType.STRING(100)),
    __metadata("design:type", String)
], User.prototype, "remember_token", void 0);
__decorate([
    AllowNull,
    Column(DataType.INTEGER),
    __metadata("design:type", Number)
], User.prototype, "current_team_id", void 0);
__decorate([
    AllowNull,
    Column(DataType.STRING(2048)),
    __metadata("design:type", String)
], User.prototype, "profile_photo_path", void 0);
__decorate([
    Default(0),
    Column(DataType.BOOLEAN),
    __metadata("design:type", Boolean)
], User.prototype, "gmail_login", void 0);
__decorate([
    Default(0),
    Column(DataType.BOOLEAN),
    __metadata("design:type", Boolean)
], User.prototype, "is_veteran_user", void 0);
__decorate([
    AllowNull,
    Column(DataType.INTEGER),
    __metadata("design:type", Number)
], User.prototype, "cxp_coins", void 0);
__decorate([
    AllowNull,
    Column(DataType.STRING(3)),
    __metadata("design:type", String)
], User.prototype, "ratings", void 0);
__decorate([
    AllowNull,
    Column(DataType.INTEGER),
    __metadata("design:type", Number)
], User.prototype, "followers", void 0);
__decorate([
    AllowNull,
    Column(DataType.INTEGER),
    __metadata("design:type", Number)
], User.prototype, "trade_transactions", void 0);
__decorate([
    AllowNull,
    Column(DataType.INTEGER),
    __metadata("design:type", Number)
], User.prototype, "trading_cards", void 0);
__decorate([
    AllowNull,
    Column(DataType.STRING),
    __metadata("design:type", String)
], User.prototype, "recover_password_token", void 0);
__decorate([
    AllowNull,
    Column(DataType.STRING(100)),
    __metadata("design:type", String)
], User.prototype, "paypal_business_email", void 0);
__decorate([
    Default(0),
    Column(DataType.BOOLEAN),
    __metadata("design:type", Boolean)
], User.prototype, "is_free_shipping", void 0);
__decorate([
    AllowNull,
    Column(DataType.DOUBLE),
    __metadata("design:type", Number)
], User.prototype, "shipping_flat_rate", void 0);
__decorate([
    AllowNull,
    Column(DataType.DOUBLE),
    __metadata("design:type", Number)
], User.prototype, "add_product_shipping_flat_rate", void 0);
User = __decorate([
    Table({
        tableName: "users", // ✅ आपके DB का table नाम
        timestamps: true, // क्योंकि created_at, updated_at हैं
        createdAt: "created_at",
        updatedAt: "updated_at",
    })
], User);
export { User };
//# sourceMappingURL=user.model.js.map