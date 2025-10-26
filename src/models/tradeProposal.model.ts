import {
    Table,
    Column,
    Model,
    DataType,
    PrimaryKey,
    AutoIncrement,
    AllowNull,
    Default,
  } from 'sequelize-typescript';
  
  @Table({
    tableName: 'trade_proposals',
    timestamps: false, // we'll define created_at and updated_at manually
  })
  export class TradeProposal extends Model<TradeProposal> {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.BIGINT.UNSIGNED)
    id!: number;
  
    @Column(DataType.STRING(30))
    code?: string;
  
    @Column(DataType.BIGINT)
    trade_sent_by?: number;
  
    @Column(DataType.BIGINT)
    trade_sent_to?: number;
  
    @Column(DataType.BIGINT)
    main_card?: number;
  
    @Column(DataType.STRING(255))
    send_cards?: string;
  
    @Column(DataType.STRING(255))
    receive_cards?: string;
  
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
  
    @Column(DataType.STRING(255))
    counter_offer?: string;
  
    @Default('1')
    @Column(DataType.ENUM('1', '0'))
    is_new!: '1' | '0';
  
    @Default('new')
    @Column(
      DataType.ENUM(
        'new',
        'accepted',
        'declined',
        'cancel',
        'counter_offer',
        'counter_accepted',
        'counter_declined',
        'complete',
      ),
    )
    trade_status!: string;
  
    @Column(DataType.DATE)
    accepted_on?: Date;
  
    @Column(DataType.BIGINT)
    trade_proxy?: number;
  
    @Column(DataType.BIGINT)
    sender_proxy_confirmation?: number;
  
    @Column(DataType.STRING(255))
    trade_sender_track_id?: string;
  
    @Column(DataType.STRING(255))
    trade_receiver_track_id?: string;
  
    @Default('0')
    @Column(DataType.ENUM('1', '0'))
    trade_sender_confrimation!: '1' | '0';
  
    @Default('0')
    @Column(DataType.ENUM('1', '0'))
    receiver_confirmation!: '1' | '0';
  
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
    admin_sender_track_id?: string;
  
    @Column(DataType.STRING(255))
    admin_receiver_track_id?: string;
  
    @Default(0)
    @Column(DataType.TINYINT)
    is_first_ship_request_submitted!: number;
  
    @Column(DataType.BIGINT)
    first_ship_request_submitted_by?: number;
  
    @Column(DataType.DATE)
    created_at?: Date;
  
    @Column(DataType.DATE)
    updated_at?: Date;
  
    @Default(0)
    @Column(DataType.TINYINT)
    is_payment_received!: number;
  
    @Column(DataType.DATE)
    payment_received_on?: Date;
  
    @Default(0)
    @Column(DataType.TINYINT)
    shipped_by_trade_sent_by!: number;

    @Column(DataType.DATE)
    shipped_on_by_trade_sent_by?: Date;

    @Default(0)
    @Column(DataType.TINYINT)
    is_edited!: number;
  
    @Default(0)
    @Column(DataType.TINYINT)
    shipped_by_trade_sent_to!: number;
  
    @Column(DataType.DATE)
    shipped_on_by_trade_sent_to?: Date;
  
    @Default(0)
    @Column(DataType.TINYINT)
    is_payment_init!: number;
  
    @Column(DataType.DATE)
    payment_init_date?: Date;
  
    @Column(DataType.BIGINT)
    trade_proposal_status_id?: number;
  }
  