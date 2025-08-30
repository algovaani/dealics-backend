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
  BelongsTo
} from "sequelize-typescript";
  import { Category } from "../models/category.model.js";
  import { User } from "../models/user.model.js";
  import { CardCondition } from "../models/cardCondition.model.js";
  
  @Table({
    tableName: "trading_cards",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  })
  export class TradingCard extends Model<TradingCard> {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    id!: number;
  
    @Default(0)
    @Column(DataType.BOOLEAN)
    is_demo!: boolean;
  
    @AllowNull
    @Column(DataType.STRING(25))
    code?: string;
  
    @AllowNull
    @Column(DataType.INTEGER)
    creator_id?: number;
  
  @ForeignKey(() => User)
  @AllowNull
  @Column(DataType.INTEGER)
  trader_id?: number;
  
    @AllowNull
    @Column(DataType.INTEGER)
    previous_owner_id?: number;
  
    @AllowNull
    @Column(DataType.INTEGER)
    sport_id?: number;
  
  @ForeignKey(() => Category)
  @AllowNull
  @Column(DataType.INTEGER)
  category_id?: number;
  
    @AllowNull
    @Column(DataType.INTEGER)
    player_id?: number;
  
    @AllowNull
    @Column(DataType.INTEGER)
    season_id?: number;
  
    @AllowNull
    @Column(DataType.INTEGER)
    manufacturer_id?: number;
  
    @AllowNull
    @Column(DataType.STRING(30))
    set_name?: string;
  
    @AllowNull
    @Column(DataType.INTEGER)
    creator?: number;
  
    @AllowNull
    @Column(DataType.INTEGER)
    exclusive_event_retailer?: number;
  
    @AllowNull
    @Column(DataType.INTEGER)
    theme?: number;
  
    @AllowNull
    @Column(DataType.STRING(20))
    card_number?: string;
  
    @Default("0")
    @Column(DataType.ENUM("1", "0"))
    is_rookie_card!: string;
  
    @Default("0")
    @Column(DataType.ENUM("1", "0"))
    is_autograph_card!: string;
  
    @Default("0")
    @Column(DataType.ENUM("1", "0"))
    graded!: string;
  
    @AllowNull
    @Column(DataType.DATE)
    graded_on?: Date;
  
    @AllowNull
    @Column(DataType.INTEGER)
    professional_grader_id?: number;
  
    @AllowNull
    @Column(DataType.INTEGER)
    grade_rating_id?: number;
  
    @ForeignKey(() => CardCondition)
    @AllowNull
    @Column(DataType.INTEGER)
    card_condition_id?: number;
  
    @AllowNull
    @Column(DataType.STRING(30))
    parallel_variety?: string;
  
    @AllowNull
    @Column(DataType.STRING(30))
    variety?: string;
  
    @AllowNull
    @Column(DataType.TEXT)
    card_numbered?: string;
  
    @AllowNull
    @Column(DataType.DOUBLE(12, 2))
    trading_card_estimated_value?: number;
  
    @AllowNull
    @Column(DataType.TEXT)
    trading_card_recent_trade_value?: string;
  
    @AllowNull
    @Column(DataType.TEXT)
    trading_card_recent_sell_link?: string;
  
    @AllowNull
    @Column(DataType.TEXT)
    description?: string;
  
    @AllowNull
    @Column(DataType.TEXT)
    trading_card_img?: string;
  
    @AllowNull
    @Column(DataType.TEXT)
    trading_card_img_back?: string;
  
    @AllowNull
    @Column(DataType.BOOLEAN)
    mark_as_deleted?: boolean;
  
    @AllowNull
    @Column(DataType.TEXT)
    title?: string;
  
    @AllowNull
    @Column(DataType.INTEGER)
    publisher?: number;
  
    @AllowNull
    @Column(DataType.INTEGER)
    publication_year?: number;
  
    @AllowNull
    @Column(DataType.TEXT)
    key_features?: string;
  
    @Default("0")
    @Column(DataType.ENUM("1", "0"))
    is_variant!: string;
  
    @AllowNull
    @Column(DataType.STRING(30))
    variant?: string;
  
    @Default("0")
    @Column(DataType.ENUM("1", "0"))
    exclusivity!: string;
  
    @Default("0")
    @Column(DataType.ENUM("1", "0"))
    store_exclusivity!: string;
  
    @Default("0")
    @Column(DataType.ENUM("1", "0"))
    limited_edition!: string;
  
    @Default("0")
    @Column(DataType.ENUM("1", "0"))
    special_edition!: string;
  
    @AllowNull
    @Column(DataType.INTEGER)
    country_id?: number;
  
    @AllowNull
    @Column(DataType.TEXT)
    format?: string;
  
    @AllowNull
    @Column(DataType.TEXT)
    dimension?: string;
  
    @AllowNull
    @Column(DataType.TEXT)
    design_style?: string;
  
    @AllowNull
    @Column(DataType.INTEGER)
    material?: number;
  
    @AllowNull
    @Column(DataType.TEXT)
    frame_presentation?: string;
  
    @AllowNull
    @Column(DataType.TEXT)
    weight?: string;
  
    @AllowNull
    @Column(DataType.STRING(30))
    card_type?: string;
  
    @AllowNull
    @Column(DataType.TEXT)
    trading_card_slug?: string;
  
    @Default("0")
    @Column(DataType.ENUM("1", "0"))
    trading_card_sold!: string;
  
    @Default("0")
    @Column(DataType.ENUM("1", "0"))
    is_traded!: string;
  
    @Default("0")
    @Column(DataType.ENUM("1", "0"))
    can_trade!: string;
  
    @Default("0")
    @Column(DataType.ENUM("1", "0"))
    can_buy!: string;
  
    @AllowNull
    @Column(DataType.DOUBLE(12, 2))
    trading_card_asking_price?: number;
  
    @AllowNull
    @Column(DataType.DOUBLE(12, 2))
    trading_card_offer_accept_above?: number;
  
    @Default("1")
    @Column(DataType.ENUM("1", "0"))
    trading_card_status!: string;
  
    @Default("0")
    @Column(DataType.ENUM("1", "0"))
    is_featured!: string;
  
    @AllowNull
    @Column(DataType.TEXT)
    search_param?: string;
  
    // ✅ You can continue remaining text, varchar, int, double fields using the same pattern.
    // Example:
    @AllowNull
    @Column(DataType.TEXT)
    printing_edition?: string;
  
    @AllowNull
    @Column(DataType.STRING(30))
    artist_band_name?: string;
  
    @AllowNull
    @Column(DataType.STRING(30))
    record_label?: string;
  
    @AllowNull
    @Column(DataType.TEXT)
    catalog_number?: string;
  
    @AllowNull
    @Column(DataType.TEXT)
    page_count?: string;
  
    @AllowNull
    @Column(DataType.TEXT)
    pressing_information?: string;
  
    @AllowNull
    @Column(DataType.TEXT)
    matrix_runout_information?: string;
  
    @AllowNull
    @Column(DataType.INTEGER)
    speed?: number;
  
    @AllowNull
    @Column(DataType.TEXT)
    tracklist?: string;
  
    @AllowNull
    @Column(DataType.TEXT)
    special_features?: string;
  
    @AllowNull
    @Column(DataType.TEXT)
    inserts_extras?: string;
  
    @AllowNull
    @Column(DataType.STRING(30))
    artist_designer_maker?: string;
  
    @AllowNull
    @Column(DataType.INTEGER)
    release_country_id?: number;
  
    @AllowNull
    @Column(DataType.STRING(30))
    album_title?: string;
  
    @AllowNull
    @Column(DataType.INTEGER)
    period_or_era?: number;
  
    @AllowNull
    @Column(DataType.INTEGER)
    release_year?: number;
  
    @AllowNull
    @Column(DataType.TEXT)
    mintage_population?: string;
  
    @AllowNull
    @Column(DataType.STRING(30))
    mint_mark?: string;
  
    @AllowNull
    @Column(DataType.STRING(30))
    denomination?: string;
  
    @AllowNull
    @Column(DataType.TEXT)
    language?: string;
  
    @AllowNull
    @Column(DataType.TEXT)
    foil_holo?: string;
  
    @AllowNull
    @Column(DataType.INTEGER)
    rarity?: number;
  
    @AllowNull
    @Column(DataType.TEXT)
    appraised_market_value?: string;
  
    @AllowNull
    @Column(DataType.TEXT)
    origin_location?: string;
  
    @AllowNull
    @Column(DataType.TEXT)
    restoration_repairs?: string;
  
    @AllowNull
    @Column(DataType.TEXT)
    historical_cultural_significance?: string;
  
    @AllowNull
    @Column(DataType.TEXT)
    technique_medium?: string;
  
    @AllowNull
    @Column(DataType.TEXT)
    signature_marks_labels?: string;
  
    @AllowNull
    @Column(DataType.TEXT)
    provenance?: string;
  
    @AllowNull
    @Column(DataType.TEXT)
    style_movement?: string;
  
    @AllowNull
    @Column(DataType.INTEGER)
    issue_country_id?: number;
  
    @AllowNull
    @Column(DataType.TEXT)
    stamp_design_subject?: string;
  
    @AllowNull
    @Column(DataType.TEXT)
    firmware_software_version?: string;
  
    @Default("0")
    @Column(DataType.ENUM("1", "0"))
    is_controllers_included!: string;
  
    @AllowNull
    @Column(DataType.INTEGER)
    storage_capacity?: number;
  
    @AllowNull
    @Column(DataType.TEXT)
    included_accessories?: string;
  
    @AllowNull
    @Column(DataType.INTEGER)
    console_name_model?: number;
  
    @AllowNull
    @Column(DataType.TEXT)
    dlc_add_ons?: string;
  
    @AllowNull
    @Column(DataType.TEXT)
    multiplayer_single_player_details?: string;
  
    @AllowNull
    @Column(DataType.TEXT)
    compatibility?: string;
  
    @AllowNull
    @Column(DataType.TEXT)
    region?: string;
  
    @AllowNull
    @Column(DataType.TEXT)
    physical_digital?: string;
  
    @AllowNull
    @Column(DataType.INTEGER)
    platform_console?: number;
  
    @AllowNull
    @Column(DataType.TEXT)
    condition_of_stamp_sheet?: string;
  
    @AllowNull
    @Column(DataType.TEXT)
    errors_misprints?: string;
  
    @AllowNull
    @Column(DataType.TEXT)
    serial_number?: string;
  
    @AllowNull
    @Column(DataType.TEXT)
    color_print_variants?: string;
  
    @AllowNull
    @Column(DataType.INTEGER)
    gum_condition?: number;
  
    @AllowNull
    @Column(DataType.TEXT)
    watermark?: string;
  
    @AllowNull
    @Column(DataType.INTEGER)
    cancellation?: number;

    @AllowNull
    @Column(DataType.INTEGER)
    perforation?: number;
  
    @AllowNull
    @Column(DataType.INTEGER)
    types?: number;
  
    @AllowNull
    @Column(DataType.TEXT)
    centering?: string;
  
    @AllowNull
    @Column(DataType.STRING(30))
    series_set?: string;
  
    @Default("0")
    @Column(DataType.ENUM("1", "0"))
    warranty!: string;
  
    @AllowNull
    @Column(DataType.TEXT)
    markings_logos_numbers?: string;
  
    @AllowNull
    @Column(DataType.TEXT)
    original_vs_reproduction?: string;
  
    @AllowNull
    @Column(DataType.INTEGER)
    brand?: number;
  
    @AllowNull
    @Column(DataType.INTEGER)
    superhero_team?: number;
  
    @AllowNull
    @Column(DataType.TEXT)
    missing_parts_accessories?: string;
  
    @AllowNull
    @Column(DataType.TEXT)
    custom_modified?: string;
  
    @AllowNull
    @Column(DataType.TEXT)
    stickers_labels?: string;
  
    @AllowNull
    @Column(DataType.TEXT)
    autograph_authentication?: string;
  
    @AllowNull
    @Column(DataType.TEXT)
    location_of_autograph?: string;
  
    @AllowNull
    @Column(DataType.TEXT)
    signedby?: string;
  
    @AllowNull
    @Column(DataType.TEXT)
    authenticity_originality?: string;
  
    @AllowNull
    @Column(DataType.TEXT)
    poseability_articulation?: string;
  
    @AllowNull
    @Column(DataType.STRING(30))
    character_brand?: string;
  
    @AllowNull
    @Column(DataType.TEXT)
    card_name?: string;
  
    @AllowNull
    @Column(DataType.TEXT)
    barcode_upc?: string;
  
    @AllowNull
    @Column(DataType.INTEGER)
    franchise?: number;
  
    @AllowNull
    @Column(DataType.INTEGER)
    size?: number;
  
    @AllowNull
    @Column(DataType.TEXT)
    loose_boxed?: string;
  
    @AllowNull
    @Column(DataType.TEXT)
    charter_name?: string;
  
    @AllowNull
    @Column(DataType.TEXT)
    pop_series?: string;
  
    @AllowNull
    @Column(DataType.DATE)
    issue_date?: Date;
  
    @AllowNull
    @Column(DataType.TEXT)
    vnyl_inserts_extras?: string;
  
    @AllowNull
    @Column(DataType.DATE)
    created_at?: Date;
  
    @AllowNull
    @Column(DataType.DATE)
    updated_at?: Date;
  
    @AllowNull
    @Column(DataType.STRING(20))
    color?: string;
  
    @AllowNull
    @Column(DataType.INTEGER)
    packaging?: number;
  
    @AllowNull
    @Column(DataType.INTEGER)
    scale?: number;
  
    @AllowNull
    @Column(DataType.INTEGER)
    year_date_of_issue?: number;
  
    @AllowNull
    @Column(DataType.TEXT)
    series_number?: string;
  
    @AllowNull
    @Column(DataType.TEXT)
    seller_notes?: string;
  
    @AllowNull
    @Column(DataType.TEXT)
    collector_number?: string;
  
    @AllowNull
    @Column(DataType.INTEGER)
    certification?: number;
  
    @AllowNull
    @Column(DataType.TEXT)
    included_missing_accessories?: string;
  
    @AllowNull
    @Column(DataType.INTEGER)
    brand_manufacturer?: number;
  
    @AllowNull
    @Column(DataType.INTEGER)
    item_type?: number;
  
    @AllowNull
    @Column(DataType.STRING(50))
    team?: string;
  
    @AllowNull
    @Column(DataType.INTEGER)
    league?: number;
  
    @AllowNull
    @Column(DataType.STRING(30))
    car_model?: string;
  
    @AllowNull
    @Column(DataType.STRING(30))
    video_game?: string;
  
    @AllowNull
    @Column(DataType.TEXT)
    manufacturer_series_number?: string;
  
    @AllowNull
    @Column(DataType.TEXT)
    character_name_series?: string;
  
    @AllowNull
    @Column(DataType.TEXT)
    certification_number?: string;
  
    @AllowNull
    @Column(DataType.STRING(20))
    box_number?: string;
  
    @AllowNull
    @Column(DataType.TEXT)
    shipping_details?: string;
  
    @AllowNull
    @Column(DataType.INTEGER)
    genre?: number;
  
    @AllowNull
    @Column(DataType.INTEGER)
    vehicle_maker?: number;
  
    @AllowNull
    @Column(DataType.INTEGER)
    vehicle_type?: number;
  
    @AllowNull
    @Column(DataType.INTEGER)
    vehicle_year?: number;
  
    @AllowNull
    @Column(DataType.STRING(30))
    featured_person_artist?: string;
  
    @Default("0")
    @Column(DataType.ENUM("1", "0"))
    is_parallel!: string;
  
    @Default("0")
    @Column(DataType.ENUM("1", "0"))
    is_serial!: string;
  
    @AllowNull
    @Column(DataType.INTEGER)
    region_code?: number;
  
    @AllowNull
    @Column(DataType.INTEGER)
    console_condition?: number;
  
    @AllowNull
    @Column(DataType.INTEGER)
    video_game_condition?: number;
  
    @AllowNull
    @Column(DataType.INTEGER)
    video_game_rating?: number;
  
    @AllowNull
    @Column(DataType.INTEGER)
    video_game_publisher?: number;
  
    @AllowNull
    @Column(DataType.INTEGER)
    video_game_genre?: number;
  
    @AllowNull
    @Column(DataType.INTEGER)
    console_brand?: number;
  
    @AllowNull
    @Column(DataType.TEXT)
    controller_name?: string;
  
    @AllowNull
    @Column(DataType.INTEGER)
    year_of_issue?: number;
  
    @AllowNull
    @Column(DataType.STRING(30))
    stamp_name?: string;
  
    @AllowNull
    @Column(DataType.INTEGER)
    feature?: number;
  
    @AllowNull
    @Column(DataType.INTEGER)
    quality?: number;
  
    @AllowNull
    @Column(DataType.INTEGER)
    topic?: number;
  
    @AllowNull
    @Column(DataType.STRING(30))
    coin_name?: string;
  
    @AllowNull
    @Column(DataType.INTEGER)
    composition?: number;
  
    @AllowNull
    @Column(DataType.INTEGER)
    circulated?: number;
  
    @AllowNull
    @Column(DataType.INTEGER)
    strike?: number;
  
    @AllowNull
    @Column(DataType.INTEGER)
    fineness?: number;
  
    @Default("0")
    @Column(DataType.ENUM("1", "0"))
    is_sleeve_graded!: string;
  
    @AllowNull
    @Column(DataType.INTEGER)
    sleeve_grader?: number;
  
    @Default("0")
    @Column(DataType.ENUM("1", "0"))
    is_record_graded!: string;
  
    @AllowNull
    @Column(DataType.INTEGER)
    record_grader?: number;
  
    @AllowNull
    @Column(DataType.INTEGER)
    coin_stamp_grade_rating?: number;
  
    @AllowNull
    @Column(DataType.INTEGER)
    universe?: number;
  
    @AllowNull
    @Column(DataType.INTEGER)
    collection?: number;
  
    @AllowNull
    @Column(DataType.INTEGER)
    product_line?: number;
  
    @AllowNull
    @Column(DataType.INTEGER)
    item_height?: number;
  
    @AllowNull
    @Column(DataType.INTEGER)
    convention_event?: number;
  
    @AllowNull
    @Column(DataType.INTEGER)
    animal_species?: number;
  
    @AllowNull
    @Column(DataType.INTEGER)
    transformer_faction?: number;
  
    @AllowNull
    @Column(DataType.INTEGER)
    record_grade_rating?: number;
  
    @AllowNull
    @Column(DataType.INTEGER)
    sleeve_grade_rating?: number;
  
    @AllowNull
    @Column(DataType.TEXT)
    superhero_team_text?: string;
  
    @AllowNull
    @Column(DataType.STRING(30))
    artist_writer?: string;
  
    @AllowNull
    @Column(DataType.STRING(30))
    cover_artist?: string;
  
    @AllowNull
    @Column(DataType.STRING(30))
    story_title?: string;
  
    @AllowNull
    @Column(DataType.INTEGER)
    record_size?: number;
  
    @AllowNull
    @Column(DataType.STRING(30))
    movie?: string;
  
    @AllowNull
    @Column(DataType.STRING(30))
    franchise_text?: string;
  
    @AllowNull
    @Column(DataType.STRING(30))
    tv_show?: string;
  
    @AllowNull
    @Column(DataType.STRING(30))
    series?: string;
  
    @AllowNull
    @Column(DataType.INTEGER)
    edition?: number;
  
    @AllowNull
    @Column(DataType.STRING(20))
    issue_number?: string;
  
    @AllowNull
    @Column(DataType.STRING(30))
    tv_streaming_show?: string;
  
    @AllowNull
    @Column(DataType.INTEGER)
    how_many_controllers?: number;
  
    @AllowNull
    @Column(DataType.INTEGER)
    format_id?: number;
  
    @Default("0")
    @Column(DataType.ENUM("1", "0"))
    is_certified!: string;
  
    @AllowNull
    @Column(DataType.STRING(50))
    sub_series?: string;
  
    @AllowNull
    @Column(DataType.STRING(30))
    sub_series_number?: string;
  
    @AllowNull
    @Column(DataType.STRING(30))
    product_number?: string;
  
    @AllowNull
    @Column(DataType.INTEGER)
    coin_name_slt?: number;
  
    @AllowNull
    @Column(DataType.INTEGER)
    denomination_slt?: number;
  
    @Default("0")
    @Column(DataType.ENUM("1", "0"))
    free_shipping!: string;
  
    @AllowNull
    @Column(DataType.TEXT)
    usa_shipping_flat_rate?: string;
  
    @AllowNull
    @Column(DataType.TEXT)
    usa_add_product_flat_rate?: string;
  
    @AllowNull
    @Column(DataType.TEXT)
    canada_shipping_flat_rate?: string;
  
    @AllowNull
    @Column(DataType.TEXT)
    canada_add_product_flat_rate?: string;

    @BelongsTo(() => Category)
    category?: Category;

    @BelongsTo(() => User)
     trader?: User;

    @BelongsTo(() => CardCondition)
    cardCondition?: CardCondition;
  } 
  