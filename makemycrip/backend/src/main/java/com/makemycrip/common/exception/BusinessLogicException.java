package com.makemycrip.common.exception;

import lombok.Getter;

@Getter
public class BusinessLogicException extends RuntimeException {

    private final String errorCode;
    private final Object details;

    public BusinessLogicException(String message) {
        super(message);
        this.errorCode = "BUSINESS_LOGIC_ERROR";
        this.details = null;
    }

    public BusinessLogicException(String message, String errorCode) {
        super(message);
        this.errorCode = errorCode;
        this.details = null;
    }

    public BusinessLogicException(String message, String errorCode, Object details) {
        super(message);
        this.errorCode = errorCode;
        this.details = details;
    }
}
