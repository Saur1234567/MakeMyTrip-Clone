package com.makemycrip.common.exception;

import lombok.Getter;

@Getter
public class PriceLockExpiredException extends RuntimeException {

    private final String errorCode;
    private final Object details;

    public PriceLockExpiredException(String message) {
        super(message);
        this.errorCode = "PRICE_LOCK_EXPIRED";
        this.details = null;
    }

    public PriceLockExpiredException(String message, String errorCode) {
        super(message);
        this.errorCode = errorCode;
        this.details = null;
    }

    public PriceLockExpiredException(String message, String errorCode, Object details) {
        super(message);
        this.errorCode = errorCode;
        this.details = details;
    }
}
