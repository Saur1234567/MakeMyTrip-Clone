package com.makemycrip.common.exception;

import lombok.Getter;

@Getter
public class RateLimitExceededException extends RuntimeException {

    private final String errorCode;
    private final Object details;
    private final long retryAfterSeconds;

    public RateLimitExceededException(String message, long retryAfterSeconds) {
        super(message);
        this.errorCode = "RATE_LIMIT_EXCEEDED";
        this.details = null;
        this.retryAfterSeconds = retryAfterSeconds;
    }

    public RateLimitExceededException(String message, String errorCode, long retryAfterSeconds) {
        super(message);
        this.errorCode = errorCode;
        this.details = null;
        this.retryAfterSeconds = retryAfterSeconds;
    }
}
