import {
    Table,
    Column,
    Model,
    DataType,
    PrimaryKey,
    AutoIncrement,
    Default,
    CreatedAt,
    UpdatedAt,
  } from 'sequelize-typescript';
  
  @Table({
    tableName: 'item_columns',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  })
  export class ItemColumn extends Model<ItemColumn> {
  
    @PrimaryKey
    @AutoIncrement
    @Column({
      type: DataType.BIGINT.UNSIGNED,
    })
    id!: number;
  
    @Column({
      type: DataType.STRING(100),
      allowNull: true,
    })
    label?: string;
  
    @Column({
      type: DataType.STRING(100),
      allowNull: true,
    })
    name?: string;
  
    @Column({
      type: DataType.STRING(30),
      allowNull: true,
    })
    type?: string;
  
    @Column({
      type: DataType.STRING(100),
      allowNull: true,
    })
    rel_model_index?: string;
  
    @Column({
      type: DataType.STRING(50),
      allowNull: true,
    })
    rel_master_table?: string;
  
    @Column({
      type: DataType.STRING(255),
      allowNull: true,
    })
    rel_model_fun?: string;
  
    @Column({
      type: DataType.STRING(255),
      allowNull: true,
    })
    rel_model_col?: string;
  
    @Column({
      type: DataType.STRING(255),
      allowNull: true,
    })
    d_class?: string;
  
    @Column({
      type: DataType.STRING(255),
      allowNull: true,
    })
    act_class?: string;
  
    @Default(1)
    @Column({
      type: DataType.TINYINT,
      allowNull: false,
    })
    do_not_show_on_detail!: number;
  
    @Default(0)
    @Column({
      type: DataType.TINYINT,
      allowNull: false,
    })
    is_newline!: number;
  
    @Column({
      type: DataType.INTEGER,
      allowNull: true,
    })
    maxlength?: number;
  
    @Column({
      type: DataType.INTEGER,
      allowNull: true,
    })
    input_maxlength?: number;
  
    @Default(0)
    @Column({
      type: DataType.TINYINT,
      allowNull: false,
    })
    is_ajax_load!: number;
  
    @Default(0)
    @Column({
      type: DataType.TINYINT,
      allowNull: false,
    })
    is_js_load!: number;
  
    @Column({
      type: DataType.TEXT,
      allowNull: true,
    })
    label_options?: string;
  
    @Column({
      type: DataType.STRING(255),
      allowNull: true,
    })
    placeholder?: string;
  
    @Column({
      type: DataType.STRING(15),
      allowNull: true,
    })
    prefix?: string;
  
    @Default(0)
    @Column({
      type: DataType.TINYINT,
      allowNull: false,
    })
    graded_ungraded!: number;
  
    @Column({
      type: DataType.TEXT,
      allowNull: true,
    })
    option_values?: string;
  
    @Column({
      type: DataType.STRING(255),
      allowNull: true,
    })
    is_loop?: string;
  
    @Default(0)
    @Column({
      type: DataType.TINYINT,
      allowNull: false,
    })
    is_highlight!: number;
  
    @Default(0)
    @Column({
      type: DataType.TINYINT,
      allowNull: false,
    })
    is_link!: number;
  
    @Default(0)
    @Column({
      type: DataType.TINYINT,
      allowNull: false,
    })
    out_of_collapse!: number;
  
    @Default(0)
    @Column({
      type: DataType.TINYINT,
      allowNull: false,
    })
    is_label_bold!: number;
  
    @Default(0)
    @Column({
      type: DataType.TINYINT,
      allowNull: false,
    })
    not_for_demo_user!: number;
  
    @CreatedAt
    @Column({
      type: DataType.DATE,
      allowNull: true,
    })
    created_at?: Date;
  
    @UpdatedAt
    @Column({
      type: DataType.DATE,
      allowNull: true,
    })
    updated_at?: Date;
  }
  