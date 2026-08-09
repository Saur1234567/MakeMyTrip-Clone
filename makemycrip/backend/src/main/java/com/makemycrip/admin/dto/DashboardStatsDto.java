package com.makemycrip.admin.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
public class DashboardStatsDto {
    // KPI counters
    private long totalBookings;
    private double bookingsChange;
    private long confirmedBookings;
    private long pendingBookings;
    private long cancelledBookings;
    private BigDecimal totalRevenue;
    private double revenueChange;
    private BigDecimal revenueThisMonth;
    private long totalHotels;
    private long activeHotels;
    private long totalUsers;
    private long totalGuests;
    private double avgOccupancyRate;
    private double occupancyRate;
    private double avgBookingValue;

    // Charts — names match what AdminDashboard.tsx expects
    /** Daily revenue data for the area chart */
    private List<RevenuePoint> revenueByDay;
    /** Booking counts grouped by status for the pie chart */
    private List<StatusCount> bookingsByStatus;
    /** Top hotels by revenue for the bar chart */
    private List<HotelRevenue> topHotels;
    /** Recent bookings list */
    private List<Object> recentBookings;

    @Data
    @Builder
    public static class RevenuePoint {
        private String date;
        private double revenue;
        private long bookings;
    }

    @Data
    @Builder
    public static class StatusCount {
        private String status;
        private long count;
    }

    @Data
    @Builder
    public static class HotelRevenue {
        private String name;
        private double revenue;
        private long bookings;
    }
}
