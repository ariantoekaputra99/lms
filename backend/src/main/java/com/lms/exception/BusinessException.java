package com.lms.exception;

/** Business rule violation (e.g. insufficient stock). Mapped to HTTP 400. */
public class BusinessException extends RuntimeException {
    public BusinessException(String message) {
        super(message);
    }
}
