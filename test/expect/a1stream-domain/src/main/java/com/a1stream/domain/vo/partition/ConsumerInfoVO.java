package com.a1stream.domain.vo.partition;

import com.a1stream.common.model.BasePartitionVO;
import com.a1stream.common.utils.UserDetailsUtil;
import com.ymsl.solid.base.util.IdUtils;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

/**
 * @author Entity Generator G3
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@EqualsAndHashCode(callSuper = true)
public class ConsumerInfoVO extends BasePartitionVO {

    private static final long serialVersionUID = 1L;
    private Long consumerId;
    private String siteId;
    private String dealerPartition;
    private String consumerCode;
    private String fullName;
    private String idNumber;
    private String mobilePhone;
    private String mobilePhone2;
    private String telNo;
    private String email;
    private String registrationDate;
    private String intraCompanyFlag;
    private String bikePurchaseFlag;
    private Long geographyId;
    private String address1;
    private String address2;
    private String postCode;
    private String contactMechanismTypeId;
    private String subDistrict;
    private String longitude;
    private String latitude;
    private String firstName;
    private String middleName;
    private String lastName;
    private String birtyday;
    private String genderTypeId;
    private String maritalStatusTypeId;
    private String education;
    private String religion;
    private String occupation;
    private String npwpNo;
    private String npwpName;
    private String deliveryAddress;
    private String expendingRange;
    private String wishToReceiveNews;
    private String comment;

    public static ConsumerInfoVOBuilder builderWithId() {
        return ConsumerInfoVO.builder().consumerId(IdUtils.getSnowflakeIdWorker().nextId());
    }

    public static ConsumerInfoVOBuilder builderWithDefault() {
        return ConsumerInfoVO.builder()
            .consumerId(IdUtils.getSnowflakeIdWorker().nextId())
            .dealerPartition(UserDetailsUtil.getDealerPartition());
    }
}
