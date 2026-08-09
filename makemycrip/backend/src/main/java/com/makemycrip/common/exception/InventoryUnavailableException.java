package com.makemycrip.common.exception;

import lombok.Getter;

@Getter
public class InventoryUnavailableException extends RuntimeException {

    private final String errorCode;
    private final Object details;

    public InventoryUnavailableException(String message) {
        super(message);
        this.errorCode = "INVENTORY_UNAVAILABLE";
        this.details = null;
    }

    public InventoryUnavailableException(String message, String errorCode) {
        super(message);
        this.errorCode = errorCode;
        this.details = null;
    }

    public InventoryUnavailableException(String message, String errorCode, Object details) {
        super(message);
        this.errorCode = errorCode;
        this.details = details;
    }
}
