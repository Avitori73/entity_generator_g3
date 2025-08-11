package com.a1stream.domain.entity;

import com.a1stream.common.model.BaseEntity;
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
@Table(name = "color_info")
public class ColorInfo extends BaseEntity implements Persistable<Long> {

    private static final long serialVersionUID = 1L;

    @Id
    @SnowflakeGenerator
    @Column(name = "color_id_", nullable = false)
    private Long colorId;

    @Column(name = "site_id_", length = 40, nullable = true)
    private String siteId;

    @Column(name = "color_code_", length = 40, nullable = true)
    private String colorCode;

    @Column(name = "description_", length = 40, nullable = true)
    private String description;

    @Transient
    private boolean isNew = true;

    @Override
    public Long getId() {
        return colorId;
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
