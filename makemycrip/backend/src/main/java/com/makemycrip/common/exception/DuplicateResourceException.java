package com.makemycrip.common.exception;

import lombok.Getter;

@Getter
public class DuplicateResourceException extends RuntimeException {

    private final String errorCode;
    private final Object details;

    public DuplicateResourceException(String message) {
        super(message);
        this.errorCode = "DUPLICATE_RESOURCE";
        this.details = null;
    }

    public DuplicateResourceException(String message, String errorCode) {
        super(message);
        this.errorCode = errorCode;
        this.details = null;
    }

    public DuplicateResourceException(String message, String errorCode, Object details) {
        super(message);
        this.errorCode = errorCode;
        this.details = details;
    }
}
