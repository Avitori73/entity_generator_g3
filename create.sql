
-- yimm_dpackweb_test.cmm_parts_campaign_component definition

-- Drop table

-- DROP TABLE cmm_parts_campaign_component;

CREATE TABLE cmm_parts_campaign_component (
	campaign_component_id_ varchar(40) DEFAULT ' '::character varying NOT NULL,
	site_id_ varchar(40) DEFAULT ' '::character varying NOT NULL,
	campaign_list_id_ varchar(40) DEFAULT ' '::character varying NOT NULL,
	parts_code_ varchar(40) NOT NULL,
	parts_name_ varchar(40) NOT NULL,
	parts_id_ varchar(40) NOT NULL,
	start_date_ varchar(8) NOT NULL,
	end_date_ varchar(8) NOT NULL,
	main_condi_strategy_code_ varchar(40) NOT NULL,
	main_bonus_strategy_code_ varchar(40) NOT NULL,
	main_is_custom_ varchar(1) NOT NULL,
	addi_condi_strategy_code_ varchar(40) NULL,
	addi_bonus_strategy_code_ varchar(40) NULL,
	addi_is_custom_ varchar(1) NOT NULL,
	issuance_flag_ varchar(1) DEFAULT '1'::character varying NOT NULL,
	remark_ varchar(255) NULL,
	update_author_ varchar(40) DEFAULT ' '::character varying NOT NULL,
	update_date_ timestamptz NOT NULL,
	create_author_ varchar(40) DEFAULT ' '::character varying NOT NULL,
	create_date_ timestamptz NOT NULL,
	update_program_ varchar(20) DEFAULT ' '::character varying NOT NULL,
	update_counter_ int4 DEFAULT 0 NOT NULL,
	CONSTRAINT pk_parts_campaign_component PRIMARY KEY (campaign_component_id_)
);


-- yimm_dpackweb_test.cmm_parts_campaign_list definition

-- Drop table

-- DROP TABLE yimm_dpackweb_test.cmm_parts_campaign_list;

CREATE TABLE yimm_dpackweb_test.cmm_parts_campaign_list (
	campaign_list_id_ varchar(40) DEFAULT ' '::character varying NOT NULL,
	site_id_ varchar(40) DEFAULT ' '::character varying NOT NULL,
	campaign_name_ varchar(100) NOT NULL,
	campaign_description_ varchar(1000) NULL,
	region_flag_ varchar(20) NOT NULL,
	component_item_type_ varchar(20) NOT NULL,
	status_ varchar(20) NOT NULL,
	charge_to_yimm_ varchar(1) NOT NULL,
	update_author_ varchar(40) DEFAULT ' '::character varying NOT NULL,
	update_date_ timestamptz NOT NULL,
	create_author_ varchar(40) DEFAULT ' '::character varying NOT NULL,
	create_date_ timestamptz NOT NULL,
	update_program_ varchar(20) DEFAULT ' '::character varying NOT NULL,
	update_counter_ int4 DEFAULT 0 NOT NULL,
	CONSTRAINT pk_campaign_list PRIMARY KEY (campaign_list_id_)
);


-- yimm_dpackweb_test.cmm_parts_campaign_reward definition

-- Drop table

-- DROP TABLE cmm_parts_campaign_reward;

CREATE TABLE cmm_parts_campaign_reward (
	campaign_reward_id_ varchar(40) DEFAULT ' '::character varying NOT NULL,
	site_id_ varchar(40) DEFAULT ' '::character varying NOT NULL,
	reward_code_ varchar(40) NULL,
	reward_name_ varchar(40) NOT NULL,
	points_ numeric(18, 2) NOT NULL,
	effective_date_ varchar(8) NOT NULL,
	expired_date_ varchar(8) NOT NULL,
	file_name_ varchar(256) NULL,
	remark_ varchar(256) NULL,
	update_author_ varchar(40) DEFAULT ' '::character varying NOT NULL,
	update_date_ timestamptz NOT NULL,
	create_author_ varchar(40) DEFAULT ' '::character varying NOT NULL,
	create_date_ timestamptz NOT NULL,
	update_program_ varchar(20) DEFAULT ' '::character varying NOT NULL,
	update_counter_ int4 DEFAULT 0 NOT NULL,
	CONSTRAINT pk_cmm_parts_campaign_reward PRIMARY KEY (campaign_reward_id_)
);


-- yimm_dpackweb_test.cmm_parts_campaign_supplier definition

-- Drop table

-- DROP TABLE cmm_parts_campaign_supplier;

CREATE TABLE cmm_parts_campaign_supplier (
	campaign_supplier_id_ varchar(40) DEFAULT ' '::character varying NOT NULL,
	site_id_ varchar(40) DEFAULT ' '::character varying NOT NULL,
	campaign_list_id_ varchar(40) DEFAULT ' '::character varying NOT NULL,
	supplier_id_ varchar(40) DEFAULT ' '::character varying NOT NULL,
	supplier_code_ varchar(20) NULL,
	supplier_name_ varchar(40) NULL,
	update_author_ varchar(40) DEFAULT ' '::character varying NOT NULL,
	update_date_ timestamptz NOT NULL,
	create_author_ varchar(40) DEFAULT ' '::character varying NOT NULL,
	create_date_ timestamptz NOT NULL,
	update_program_ varchar(20) DEFAULT ' '::character varying NOT NULL,
	update_counter_ int4 DEFAULT 0 NOT NULL,
	CONSTRAINT pk_campaign_suppliers PRIMARY KEY (campaign_supplier_id_)
);

-- yimm_dpackweb_test.cmm_additional_reward_rule definition

-- Drop table

-- DROP TABLE cmm_additional_reward_rule;

CREATE TABLE cmm_additional_reward_rule (
	addi_reward_id_ varchar(40) DEFAULT ' '::character varying NOT NULL,
	site_id_ varchar(40) DEFAULT ' '::character varying NOT NULL,
	main_reward_id_ varchar(40) DEFAULT ' '::character varying NOT NULL,
	campaign_component_id_ varchar(40) DEFAULT ' '::character varying NOT NULL,
	level_ int4 NOT NULL,
	from_ numeric(18, 2) NULL,
	to_ numeric(18, 2) NULL,
	from_operator_ varchar(2) NULL,
	to_operator_ varchar(2) NULL,
	value_ numeric(18, 2) NULL,
	formula_ varchar(40) NULL,
	gift_id_ varchar(40) null,
	gift_qty_ numeric(18, 2) NULL,
	update_author_ varchar(40) DEFAULT ' '::character varying NOT NULL,
	update_date_ timestamptz NOT NULL,
	create_author_ varchar(40) DEFAULT ' '::character varying NOT NULL,
	create_date_ timestamptz NOT NULL,
	update_program_ varchar(20) DEFAULT ' '::character varying NOT NULL,
	update_counter_ int4 DEFAULT 0 NOT NULL,
	CONSTRAINT pk_cmm_additional_reward_rule PRIMARY KEY (addi_reward_id_)
);


-- yimm_dpackweb_test.cmm_main_reward_rule definition

-- Drop table

-- DROP TABLE cmm_main_reward_rule;

CREATE TABLE cmm_main_reward_rule (
	main_reward_id_ varchar(40) DEFAULT ' '::character varying NOT NULL,
	site_id_ varchar(40) DEFAULT ' '::character varying NOT NULL,
	campaign_component_id_ varchar(40) DEFAULT ' '::character varying NOT NULL,
	level_ int4 NOT NULL,
	from_ numeric(18, 2) NULL,
	to_ numeric(18, 2) NULL,
	from_operator_ varchar(2) NULL,
	to_operator_ varchar(2) NULL,
	value_ numeric(18, 2) NULL,
	formula_ varchar(40) NULL,
	gift_id_ varchar(40) null,
	gift_qty_ numeric(18, 2) NULL,
	update_author_ varchar(40) DEFAULT ' '::character varying NOT NULL,
	update_date_ timestamptz NOT NULL,
	create_author_ varchar(40) DEFAULT ' '::character varying NOT NULL,
	create_date_ timestamptz NOT NULL,
	update_program_ varchar(20) DEFAULT ' '::character varying NOT NULL,
	update_counter_ int4 DEFAULT 0 NOT NULL,
	CONSTRAINT pk_cmm_main_reward_rule PRIMARY KEY (main_reward_id_)
);

-- yimm_dpackweb_test.parts_group_info definition

-- Drop table

-- DROP TABLE yimm_dpackweb_test.parts_group_info;

CREATE TABLE yimm_dpackweb_test.parts_group_info (
	product_id_ varchar(40) DEFAULT ' '::character varying NOT NULL,
	site_id_ varchar(40) NOT NULL,
	product_code_ varchar(40) NULL,
	english_description_ varchar(256) NULL,
	mandatory_qty_ numeric(18, 2) NULL,
	product_level_ int4 NULL,
	to_product_id_ varchar(40) NULL,
	update_author_ varchar(40) DEFAULT ' '::character varying NOT NULL,
	update_date_ timestamptz NOT NULL,
	create_author_ varchar(40) DEFAULT ' '::character varying NOT NULL,
	create_date_ timestamptz NOT NULL,
	update_program_ varchar(20) DEFAULT ' '::character varying NOT NULL,
	update_counter_ int4 DEFAULT 0 NOT NULL,
	CONSTRAINT pk_parts_group_info PRIMARY KEY (product_id_)
);
