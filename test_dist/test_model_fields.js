"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestTradingCard = void 0;
var sequelize_typescript_1 = require("sequelize-typescript");
var TestTradingCard = function () {
    var _classDecorators = [(0, sequelize_typescript_1.Table)({
            tableName: 'trading_cards',
            timestamps: true,
            createdAt: 'created_at',
            updatedAt: 'updated_at'
        })];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _classSuper = sequelize_typescript_1.Model;
    var _id_decorators;
    var _id_initializers = [];
    var _id_extraInitializers = [];
    var _shoe_size_decorators;
    var _shoe_size_initializers = [];
    var _shoe_size_extraInitializers = [];
    var _style_code_decorators;
    var _style_code_initializers = [];
    var _style_code_extraInitializers = [];
    var _release_date_decorators;
    var _release_date_initializers = [];
    var _release_date_extraInitializers = [];
    var _retail_price_decorators;
    var _retail_price_initializers = [];
    var _retail_price_extraInitializers = [];
    var TestTradingCard = _classThis = /** @class */ (function (_super) {
        __extends(TestTradingCard_1, _super);
        function TestTradingCard_1() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.id = __runInitializers(_this, _id_initializers, void 0);
            _this.shoe_size = (__runInitializers(_this, _id_extraInitializers), __runInitializers(_this, _shoe_size_initializers, void 0));
            _this.style_code = (__runInitializers(_this, _shoe_size_extraInitializers), __runInitializers(_this, _style_code_initializers, void 0));
            _this.release_date = (__runInitializers(_this, _style_code_extraInitializers), __runInitializers(_this, _release_date_initializers, void 0));
            _this.retail_price = (__runInitializers(_this, _release_date_extraInitializers), __runInitializers(_this, _retail_price_initializers, void 0));
            __runInitializers(_this, _retail_price_extraInitializers);
            return _this;
        }
        return TestTradingCard_1;
    }(_classSuper));
    __setFunctionName(_classThis, "TestTradingCard");
    (function () {
        var _a;
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create((_a = _classSuper[Symbol.metadata]) !== null && _a !== void 0 ? _a : null) : void 0;
        _id_decorators = [sequelize_typescript_1.PrimaryKey, sequelize_typescript_1.AutoIncrement, (0, sequelize_typescript_1.Column)({ type: sequelize_typescript_1.DataType.INTEGER })];
        _shoe_size_decorators = [sequelize_typescript_1.AllowNull, (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.INTEGER)];
        _style_code_decorators = [sequelize_typescript_1.AllowNull, (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.STRING(50))];
        _release_date_decorators = [sequelize_typescript_1.AllowNull, (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.DATE)];
        _retail_price_decorators = [sequelize_typescript_1.AllowNull, (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.DOUBLE(12, 2))];
        __esDecorate(null, null, _id_decorators, { kind: "field", name: "id", static: false, private: false, access: { has: function (obj) { return "id" in obj; }, get: function (obj) { return obj.id; }, set: function (obj, value) { obj.id = value; } }, metadata: _metadata }, _id_initializers, _id_extraInitializers);
        __esDecorate(null, null, _shoe_size_decorators, { kind: "field", name: "shoe_size", static: false, private: false, access: { has: function (obj) { return "shoe_size" in obj; }, get: function (obj) { return obj.shoe_size; }, set: function (obj, value) { obj.shoe_size = value; } }, metadata: _metadata }, _shoe_size_initializers, _shoe_size_extraInitializers);
        __esDecorate(null, null, _style_code_decorators, { kind: "field", name: "style_code", static: false, private: false, access: { has: function (obj) { return "style_code" in obj; }, get: function (obj) { return obj.style_code; }, set: function (obj, value) { obj.style_code = value; } }, metadata: _metadata }, _style_code_initializers, _style_code_extraInitializers);
        __esDecorate(null, null, _release_date_decorators, { kind: "field", name: "release_date", static: false, private: false, access: { has: function (obj) { return "release_date" in obj; }, get: function (obj) { return obj.release_date; }, set: function (obj, value) { obj.release_date = value; } }, metadata: _metadata }, _release_date_initializers, _release_date_extraInitializers);
        __esDecorate(null, null, _retail_price_decorators, { kind: "field", name: "retail_price", static: false, private: false, access: { has: function (obj) { return "retail_price" in obj; }, get: function (obj) { return obj.retail_price; }, set: function (obj, value) { obj.retail_price = value; } }, metadata: _metadata }, _retail_price_initializers, _retail_price_extraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        TestTradingCard = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return TestTradingCard = _classThis;
}();
exports.TestTradingCard = TestTradingCard;
