package com.makemycrip.common.exception;

import lombok.Getter;

@Getter
public class BookingConflictException extends RuntimeException {

    private final String errorCode;
    private final Object details;

    public BookingConflictException(String message) {
        super(message);
        this.errorCode = "BOOKING_CONFLICT";
        this.details = null;
    }

    public BookingConflictException(String message, String errorCode) {
        super(message);
        this.errorCode = errorCode;
        this.details = null;
    }

    public BookingConflictException(String message, String errorCode, Object details) {
        super(message);
        this.errorCode = errorCode;
        this.details = details;
    }
}
