package com.makemycrip.admin.controller;

import com.makemycrip.booking.entity.Booking;
import com.makemycrip.booking.repository.BookingRepository;
import com.makemycrip.booking.service.PdfInvoiceService;
import com.makemycrip.common.audit.AdminAuditLog;
import com.makemycrip.common.audit.AdminAuditLogRepository;
import com.makemycrip.common.exception.ResourceNotFoundException;
import com.makemycrip.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Admin - Audit & Invoice")
public class AdminAuditController {

    private final AdminAuditLogRepository auditLogRepository;
    private final BookingRepository bookingRepository;
    private final PdfInvoiceService pdfInvoiceService;

    @Operation(summary = "Get audit logs")
    @GetMapping("/audit-logs")
    public ResponseEntity<ApiResponse<Page<AdminAuditLog>>> getAuditLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String entityType) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by("performedAt").descending());
        Page<AdminAuditLog> logs = auditLogRepository.findAll(pageable);
        return ResponseEntity.ok(ApiResponse.success(logs, "Audit logs fetched"));
    }

    @Operation(summary = "Download invoice PDF (admin)")
    @GetMapping("/bookings/{bookingId}/invoice")
    @PreAuthorize("hasAnyRole('ADMIN', 'HOTEL_MANAGER')")
    public ResponseEntity<byte[]> downloadInvoice(@PathVariable UUID bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found"));
        byte[] pdf = pdfInvoiceService.generateInvoice(booking);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("attachment",
                "MakeMyCrip-Invoice-" + booking.getBookingReference() + ".pdf");
        return ResponseEntity.ok().headers(headers).body(pdf);
    }
}
