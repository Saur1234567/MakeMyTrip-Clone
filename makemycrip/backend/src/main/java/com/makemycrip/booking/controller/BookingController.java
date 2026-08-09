package com.makemycrip.booking.controller;

import com.makemycrip.booking.dto.*;
import com.makemycrip.booking.service.BookingService;
import com.makemycrip.booking.service.PdfInvoiceService;
import com.makemycrip.booking.entity.Booking;
import com.makemycrip.booking.repository.BookingRepository;
import com.makemycrip.common.exception.ResourceNotFoundException;
import com.makemycrip.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/bookings")
@RequiredArgsConstructor
@Tag(name = "Bookings", description = "Booking lifecycle: initiate, confirm, cancel, modify")
public class BookingController {

    private final BookingService bookingService;
    private final PdfInvoiceService pdfInvoiceService;
    private final BookingRepository bookingRepository;

    @Operation(summary = "Initiate booking (step 1)")
    @PostMapping("/initiate")
    public ResponseEntity<ApiResponse<BookingResponse>> initiateBooking(
            @Valid @RequestBody InitiateBookingRequest request,
            @AuthenticationPrincipal String userId,
            HttpServletRequest httpRequest) {
        BookingResponse response = bookingService.initiateBooking(userId, request, httpRequest);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(response, "Booking initiated successfully", HttpStatus.CREATED));
    }

    @Operation(summary = "Get user bookings")
    @GetMapping
    public ResponseEntity<ApiResponse<Page<BookingResponse>>> getMyBookings(
            @AuthenticationPrincipal String userId,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Page<BookingResponse> bookings = bookingService.getUserBookings(userId, status, page, size);
        return ResponseEntity.ok(ApiResponse.success(bookings, "Bookings fetched successfully"));
    }

    @Operation(summary = "Get booking detail by reference")
    @GetMapping("/{bookingRef}")
    public ResponseEntity<ApiResponse<BookingResponse>> getBooking(
            @PathVariable String bookingRef,
            @AuthenticationPrincipal String userId) {
        BookingResponse booking = bookingService.getBookingDetail(userId, bookingRef);
        return ResponseEntity.ok(ApiResponse.success(booking, "Booking fetched successfully"));
    }

    @Operation(summary = "Preview cancellation refund")
    @GetMapping("/{bookingRef}/cancel/preview")
    public ResponseEntity<ApiResponse<CancellationPreviewDto>> getCancellationPreview(
            @PathVariable String bookingRef,
            @AuthenticationPrincipal String userId) {
        CancellationPreviewDto preview = bookingService.getCancellationPreview(userId, bookingRef);
        return ResponseEntity.ok(ApiResponse.success(preview, "Cancellation preview fetched"));
    }

    @Operation(summary = "Cancel booking")
    @PostMapping("/{bookingRef}/cancel")
    public ResponseEntity<ApiResponse<BookingResponse>> cancelBooking(
            @PathVariable String bookingRef,
            @Valid @RequestBody CancellationRequest request,
            @AuthenticationPrincipal String userId) {
        BookingResponse response = bookingService.cancelBooking(userId, bookingRef, request);
        return ResponseEntity.ok(ApiResponse.success(response, "Booking cancelled successfully"));
    }

    @Operation(summary = "Download invoice PDF")
    @GetMapping("/{bookingRef}/invoice")
    public ResponseEntity<byte[]> downloadInvoice(
            @PathVariable String bookingRef,
            @AuthenticationPrincipal String userId) {
        Booking booking = bookingRepository.findByBookingReference(bookingRef)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found: " + bookingRef));
        byte[] pdf = pdfInvoiceService.generateInvoice(booking);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("attachment",
                "MakeMyCrip-Invoice-" + bookingRef + ".pdf");
        return ResponseEntity.ok().headers(headers).body(pdf);
    }
}
