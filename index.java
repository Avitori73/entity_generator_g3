package com.a1stream.domain.vo.partition;
import com.ymsl.solid.base.util.IdUtils;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import com.a1stream.common.utils.UserDetailsUtil;
import com.a1stream.common.model.BasePartitionVO;
/**
 * @author Entity Generator G3
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@EqualsAndHashCode(callSuper = true)
public class ConsumerInfoVO extends BasePartitionVO
{
private static final long serialVersionUID = 1L;
private Long pkConsumerId;
private Long consumerId;
@Builder.Default
private String siteId = " ";
private String dealerPartition;
@Builder.Default
private String businessType = "ALL";
private String consumerCode;
private String genderTypeId;
private String maritalStatusTypeId;
private String comment;
private String registrationDate;
private String wishToReceiveNews;
private String mobilePhone;
private String idType;
private String idNumber;
private String fullName;
private String birtyday;
private String education;
private String occupation;
private String email;
private String religion;
private String telNo;
private String deliveryAddress;
private String expendingRange;
private String npwpNo;
private String npwpName;
private String mobilePhone2;
private Long districtId;
private String address1;
private String address2;
private String postCode;
private String subDistrict;
private String longitude;
private String latitude;
private String intraCompanyFlag;
private String familyCardNo;
@Builder.Default
private String agreementSign = "N";
public static ConsumerInfoVOBuilder builderWithId()
{
return ConsumerInfoVO.builder().pkConsumerId(IdUtils.getSnowflakeIdWorker().nextId());
}
public static ConsumerInfoVOBuilder builderWithDefault()
{
return ConsumerInfoVO.builder()
    .pkConsumerId(IdUtils.getSnowflakeIdWorker().nextId())
    .dealerPartition(UserDetailsUtil.getDealerPartition());
}
}
