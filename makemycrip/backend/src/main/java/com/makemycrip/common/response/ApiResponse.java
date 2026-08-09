package com.makemycrip.common.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;
import org.springframework.http.HttpStatus;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> {

    private LocalDateTime timestamp;
    private Integer status;
    private String message;
    private T data;
    private String error;
    private String path;
    private List<ApiSubError> subErrors;

    public static <T> ApiResponse<T> success(T data) {
        return ApiResponse.<T>builder()
                .timestamp(LocalDateTime.now())
                .status(HttpStatus.OK.value())
                .message("Success")
                .data(data)
                .build();
    }

    public static ApiResponse<Void> error(String message, String errorCode) {
        return ApiResponse.<Void>builder()
                .timestamp(LocalDateTime.now())
                .status(HttpStatus.BAD_REQUEST.value())
                .error(errorCode)
                .message(message)
                .build();
    }

    public static <T> ApiResponse<T> success(T data, String message) {
        return ApiResponse.<T>builder()
                .timestamp(LocalDateTime.now())
                .status(HttpStatus.OK.value())
                .message(message)
                .data(data)
                .build();
    }

    public static <T> ApiResponse<T> success(T data, String message, HttpStatus httpStatus) {
        return ApiResponse.<T>builder()
                .timestamp(LocalDateTime.now())
                .status(httpStatus.value())
                .message(message)
                .data(data)
                .build();
    }

    public static ApiResponse<Void> error(HttpStatus httpStatus, String message,
                                          String path, List<ApiSubError> subErrors) {
        return ApiResponse.<Void>builder()
                .timestamp(LocalDateTime.now())
                .status(httpStatus.value())
                .error(httpStatus.getReasonPhrase())
                .message(message)
                .path(path)
                .subErrors(subErrors)
                .build();
    }

    public static ApiResponse<Void> error(HttpStatus httpStatus, String message, String path) {
        return error(httpStatus, message, path, null);
    }
}
