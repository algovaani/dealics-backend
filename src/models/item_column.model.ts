import {
    Table,
    Column,
    Model,
    DataType,
    PrimaryKey,
    AutoIncrement,
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
  
    @Column({
      type: DataType.TINYINT,
      allowNull: false,
      defaultValue: 1,
    })
    do_not_show_on_detail!: number;
  
    @Column({
      type: DataType.TINYINT,
      allowNull: false,
      defaultValue: 0,
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
  
    @Column({
      type: DataType.TINYINT,
      allowNull: false,
      defaultValue: 0,
    })
    is_ajax_load!: number;
  
    @Column({
      type: DataType.TINYINT,
      allowNull: false,
      defaultValue: 0,
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
  
    @Column({
      type: DataType.TINYINT,
      allowNull: false,
      defaultValue: 0,
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
  
    @Column({
      type: DataType.TINYINT,
      allowNull: false,
      defaultValue: 0,
    })
    is_highlight!: number;
  
    @Column({
      type: DataType.TINYINT,
      allowNull: false,
      defaultValue: 0,
    })
    is_link!: number;
  
    @Column({
      type: DataType.TINYINT,
      allowNull: false,
      defaultValue: 0,
    })
    out_of_collapse!: number;
  
    @Column({
      type: DataType.TINYINT,
      allowNull: false,
      defaultValue: 0,
    })
    is_label_bold!: number;
  
    @Column({
      type: DataType.TINYINT,
      allowNull: false,
      defaultValue: 0,
    })
    not_for_demo_user!: number;
  
        @CreatedAt
    @Column({ field: 'created_at', type: DataType.DATE })
    created_at?: Date;

    @UpdatedAt
    @Column({ field: 'updated_at', type: DataType.DATE })
    updated_at?: Date;
  }
  