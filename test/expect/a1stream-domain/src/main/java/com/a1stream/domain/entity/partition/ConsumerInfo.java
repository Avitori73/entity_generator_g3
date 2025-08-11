package com.a1stream.domain.entity.partition;

import com.a1stream.common.model.BasePartitionEntity;
import com.ymsl.solid.jpa.uuid.annotation.SnowflakeGenerator;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PostLoad;
import jakarta.persistence.PostPersist;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import lombok.Getter;
import lombok.Setter;
import org.springframework.data.domain.Persistable;

/**
 * @author Entity Generator G3
 */
@Entity
@Getter
@Setter
@Table(name = "consumer_info")
public class ConsumerInfo extends BasePartitionEntity implements Persistable<Long> {

    private static final long serialVersionUID = 1L;

    @Id
    @SnowflakeGenerator
    @Column(name = "consumer_id_", nullable = false)
    private Long consumerId;

    @Column(name = "site_id_", length = 40, nullable = false)
    private String siteId;

    @Column(name = "dealer_partition_", length = 20, nullable = false)
    private String dealerPartition;

    @Column(name = "consumer_code_", length = 20, nullable = true)
    private String consumerCode;

    @Column(name = "full_name_", length = 80, nullable = true)
    private String fullName;

    @Column(name = "id_number_", length = 50, nullable = true)
    private String idNumber;

    @Column(name = "mobile_phone_", length = 40, nullable = true)
    private String mobilePhone;

    @Column(name = "mobile_phone2_", length = 20, nullable = true)
    private String mobilePhone2;

    @Column(name = "tel_no_", length = 20, nullable = true)
    private String telNo;

    @Column(name = "email_", length = 80, nullable = true)
    private String email;

    @Column(name = "registration_date_", length = 8, nullable = true)
    private String registrationDate;

    @Column(name = "intra_company_flag_", length = 1, nullable = true)
    private String intraCompanyFlag;

    @Column(name = "bike_purchase_flag_", length = 1, nullable = true)
    private String bikePurchaseFlag;

    @Column(name = "geography_id_", nullable = true)
    private Long geographyId;

    @Column(name = "address1_", length = 256, nullable = true)
    private String address1;

    @Column(name = "address2_", length = 256, nullable = true)
    private String address2;

    @Column(name = "post_code_", length = 20, nullable = true)
    private String postCode;

    @Column(name = "contact_mechanism_type_id_", length = 40, nullable = true)
    private String contactMechanismTypeId;

    @Column(name = "sub_district_", length = 100, nullable = true)
    private String subDistrict;

    @Column(name = "longitude_", length = 40, nullable = true)
    private String longitude;

    @Column(name = "latitude_", length = 40, nullable = true)
    private String latitude;

    @Column(name = "first_name_", length = 60, nullable = true)
    private String firstName;

    @Column(name = "middle_name_", length = 60, nullable = true)
    private String middleName;

    @Column(name = "last_name_", length = 60, nullable = true)
    private String lastName;

    @Column(name = "birtyday_", length = 8, nullable = true)
    private String birtyday;

    @Column(name = "gender_type_id_", length = 40, nullable = true)
    private String genderTypeId;

    @Column(name = "marital_status_type_id_", length = 40, nullable = true)
    private String maritalStatusTypeId;

    @Column(name = "education_", length = 40, nullable = true)
    private String education;

    @Column(name = "religion_", length = 40, nullable = true)
    private String religion;

    @Column(name = "occupation_", length = 40, nullable = true)
    private String occupation;

    @Column(name = "npwp_no_", length = 40, nullable = true)
    private String npwpNo;

    @Column(name = "npwp_name_", length = 80, nullable = true)
    private String npwpName;

    @Column(name = "delivery_address_", length = 200, nullable = true)
    private String deliveryAddress;

    @Column(name = "expending_range_", length = 40, nullable = true)
    private String expendingRange;

    @Column(name = "wish_to_receive_news_", length = 4, nullable = true)
    private String wishToReceiveNews;

    @Column(name = "comment_", length = 256, nullable = true)
    private String comment;

    @Transient
    private boolean isNew = true;

    @Override
    public Long getId() {
        return consumerId;
    }

    @Override
    public boolean isNew() {
        return isNew;
    }

    @PostPersist
    @PostLoad
    public void markAsNotNew() {
        this.isNew = false;
    }
}
