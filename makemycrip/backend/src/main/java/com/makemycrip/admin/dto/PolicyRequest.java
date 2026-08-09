package com.makemycrip.admin.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class PolicyRequest {
    private String policyType;
    private String title;
    private String description;
    private Integer sortOrder;
}
