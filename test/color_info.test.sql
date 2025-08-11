-- yimm_dpackweb_test.color_info definition

-- Drop table

-- DROP TABLE yimm_dpackweb_test.color_info;

CREATE TABLE yimm_dpackweb_test.color_info (
	color_id_ int8 NOT NULL,
	site_id_ varchar(40) NULL,
	color_code_ varchar(40) NULL,
	description_ varchar(40) NULL,
	update_author_ varchar(40) DEFAULT ' '::character varying NOT NULL,
	update_date_ timestamptz NOT NULL,
	create_author_ varchar(40) DEFAULT ' '::character varying NOT NULL,
	create_date_ timestamptz NOT NULL,
	update_program_ varchar(20) DEFAULT ' '::character varying NOT NULL,
	update_counter_ int4 DEFAULT 0 NOT NULL,
	CONSTRAINT pk_color_info PRIMARY KEY (color_id_)
);
