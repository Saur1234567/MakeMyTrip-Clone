package com.makemycrip.admin.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class AmenityRequest {
    private String amenityName;
    private String amenityIcon;
    private String category;
    private Boolean isPaid;
    private String priceInfo;
    private Boolean isActive;
}
