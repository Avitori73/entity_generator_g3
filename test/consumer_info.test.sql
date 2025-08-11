-- yimm_dpackweb_test.consumer_info definition

-- Drop table

-- DROP TABLE yimm_dpackweb_test.consumer_info;

CREATE TABLE yimm_dpackweb_test.consumer_info (
	consumer_id_ int8 NOT NULL,
	site_id_ varchar(40) NOT NULL,
	dealer_partition_ varchar(20) NOT NULL,
	consumer_code_ varchar(20) NULL,
	full_name_ varchar(80) NULL,
	id_number_ varchar(50) NULL,
	mobile_phone_ varchar(40) NULL,
	mobile_phone2_ varchar(20) NULL,
	tel_no_ varchar(20) NULL,
	email_ varchar(80) NULL,
	registration_date_ varchar(8) NULL,
	intra_company_flag_ varchar(1) NULL,
	bike_purchase_flag_ varchar(1) NULL,
	geography_id_ int8 NULL,
	address1_ varchar(256) NULL,
	address2_ varchar(256) NULL,
	post_code_ varchar(20) NULL,
	contact_mechanism_type_id_ varchar(40) NULL,
	sub_district_ varchar(100) NULL,
	longitude_ varchar(40) NULL,
	latitude_ varchar(40) NULL,
	first_name_ varchar(60) NULL,
	middle_name_ varchar(60) NULL,
	last_name_ varchar(60) NULL,
	birtyday_ varchar(8) NULL,
	gender_type_id_ varchar(40) NULL,
	marital_status_type_id_ varchar(40) NULL,
	education_ varchar(40) NULL,
	religion_ varchar(40) NULL,
	occupation_ varchar(40) NULL,
	npwp_no_ varchar(40) NULL,
	npwp_name_ varchar(80) NULL,
	delivery_address_ varchar(200) NULL,
	expending_range_ varchar(40) NULL,
	wish_to_receive_news_ varchar(4) NULL,
	comment_ varchar(256) NULL,
	update_author_ varchar(40) DEFAULT ' '::character varying NOT NULL,
	update_date_ timestamptz NOT NULL,
	create_author_ varchar(40) DEFAULT ' '::character varying NOT NULL,
	create_date_ timestamptz NOT NULL,
	update_program_ varchar(20) DEFAULT ' '::character varying NOT NULL,
	update_counter_ int4 DEFAULT 0 NOT NULL,
	CONSTRAINT pk_consumer_info PRIMARY KEY (consumer_id_, dealer_partition_)
)
PARTITION BY LIST (dealer_partition_);
