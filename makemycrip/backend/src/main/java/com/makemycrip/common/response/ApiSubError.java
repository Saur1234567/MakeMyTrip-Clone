package com.makemycrip.common.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ApiSubError {
    private String field;
    private Object rejectedValue;
    private String message;
}
