package com.makemycrip.admin.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class FaqRequest {
    private String question;
    private String answer;
    private Integer sortOrder;
    private Boolean isActive;
}
