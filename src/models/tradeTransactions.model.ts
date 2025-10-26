import {
    Table,
    Column,
    Model,
    DataType,
    PrimaryKey,
    AutoIncrement,
    Default,
  } from 'sequelize-typescript';
  
  @Table({
    tableName: 'trade_transactions',
    timestamps: false, // we use created_at and updated_at manually
  })
  export class TradeTransaction extends Model<TradeTransaction> {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.BIGINT.UNSIGNED)
    id!: number;
  
    @Column(DataType.BIGINT)
    trade_id?: number;
  
    @Column(DataType.STRING(50))
    order_id?: string;
  
    @Column(DataType.BIGINT)
    trade_proposal_id?: number;
  
    @Column(DataType.BIGINT)
    trade_sent_by_key?: number;
  
    @Column(DataType.STRING(255))
    trade_sent_by_value?: string;
  
    @Column(DataType.BIGINT)
    trade_sent_to_key?: number;
  
    @Column(DataType.STRING(255))
    trade_sent_to_value?: string;
  
    @Column(DataType.BIGINT)
    main_card_id?: number;
  
    @Column(DataType.TEXT)
    main_card_name?: string;
  
    @Column(DataType.STRING(255))
    receive_cards?: string;
  
    @Column(DataType.STRING(255))
    send_cards?: string;
  
    @Column(DataType.DOUBLE)
    add_cash?: number;
  
    @Column(DataType.DOUBLE)
    ask_cash?: number;
  
    @Column(DataType.DATE)
    trade_amount_paid_on?: Date;
  
    @Column(DataType.STRING(255))
    trade_amount_pay_id?: string;
  
    @Column(DataType.STRING(255))
    trade_amount_payer_id?: string;
  
    @Column(DataType.STRING(255))
    trade_amount_amount?: string;
  
    @Column(DataType.STRING(255))
    trade_amount_pay_status?: string;
  
    @Column(DataType.TEXT)
    message?: string;
  
    @Column(DataType.TEXT)
    counter_personalized_message?: string;
  
    @Default('0')
    @Column(DataType.ENUM('1', '0'))
    use_trade_proxy!: '1' | '0';
  
    @Column(DataType.BIGINT)
    sender_proxy_confirmation?: number;
  
    @Default('0')
    @Column(DataType.ENUM('1', '0'))
    use_request_card_first!: '1' | '0';
  
    @Column(DataType.BIGINT)
    proxy_fee_amt?: number;
  
    @Column(DataType.DATE)
    sender_proxyfee_paid_on?: Date;
  
    @Column(DataType.STRING(255))
    sender_proxy_pay_id?: string;
  
    @Column(DataType.STRING(255))
    sender_proxy_payer_id?: string;
  
    @Column(DataType.STRING(255))
    sender_proxy_amount?: string;
  
    @Column(DataType.STRING(255))
    sender_proxy_pay_status?: string;
  
    @Column(DataType.DATE)
    receiver_proxyfee_paid_on?: Date;
  
    @Column(DataType.STRING(255))
    receiver_proxy_pay_id?: string;
  
    @Column(DataType.STRING(255))
    receiver_proxy_payer_id?: string;
  
    @Column(DataType.STRING(255))
    receiver_proxy_amount?: string;
  
    @Column(DataType.STRING(255))
    receiver_proxy_pay_status?: string;
  
    @Column(DataType.STRING(255))
    sender_track_id?: string;
  
    @Column(DataType.STRING(255))
    receiver_track_id?: string;
  
    @Column(DataType.STRING(255))
    admin_sender_track_id?: string;
  
    @Column(DataType.STRING(255))
    admin_receiver_track_id?: string;
  
    @Column(DataType.STRING(255))
    confirmation_from_sender?: string;
  
    @Column(DataType.STRING(255))
    confirmation_from_receiver?: string;
  
    @Column(DataType.DATE)
    trade_created_at?: Date;
  
    @Column(DataType.DATE)
    created_at?: Date;
  
    @Column(DataType.DATE)
    updated_at?: Date;
  }
  