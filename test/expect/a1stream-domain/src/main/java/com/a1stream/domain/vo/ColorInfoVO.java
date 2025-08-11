package com.a1stream.domain.vo;

import com.a1stream.common.model.BaseVO;
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
public class ColorInfoVO extends BaseVO {

    private static final long serialVersionUID = 1L;
    private Long colorId;
    private String siteId;
    private String colorCode;
    private String description;

    public static ColorInfoVOBuilder builderWithId() {
        return ColorInfoVO.builder().colorId(IdUtils.getSnowflakeIdWorker().nextId());
    }
}
