package com.makemycrip.admin.service;

import com.makemycrip.admin.dto.DashboardStatsDto;
import com.makemycrip.booking.entity.Booking;
import com.makemycrip.booking.enums.BookingStatus;
import com.makemycrip.booking.repository.BookingRepository;
import com.makemycrip.hotel.entity.Hotel;
import com.makemycrip.hotel.entity.HotelImage;
import com.makemycrip.hotel.entity.RoomType;
import com.makemycrip.hotel.enums.HotelStatus;
import com.makemycrip.hotel.repository.HotelRepository;
import com.makemycrip.hotel.repository.RoomTypeRepository;
import com.makemycrip.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminDashboardService {

    private final BookingRepository bookingRepository;
    private final HotelRepository hotelRepository;
    private final RoomTypeRepository roomTypeRepository;
    private final UserRepository userRepository;

    public DashboardStatsDto getDashboardStats() {
        long totalBookings = bookingRepository.count();
        long confirmedBookings = bookingRepository.countByStatus(BookingStatus.CONFIRMED);
        long pendingBookings = bookingRepository.countByStatus(BookingStatus.PAYMENT_PENDING);
        long cancelledBookings = bookingRepository.countByStatus(BookingStatus.CANCELLED);
        long checkedInBookings = bookingRepository.countByStatus(BookingStatus.CHECKED_IN);
        long checkedOutBookings = bookingRepository.countByStatus(BookingStatus.CHECKED_OUT);
        long totalHotels = hotelRepository.count();
        long activeHotels = hotelRepository.countByStatus(HotelStatus.ACTIVE);
        long totalUsers = userRepository.count();

        // Revenue: sum totalAmount from CONFIRMED + CHECKED_IN + CHECKED_OUT bookings
        List<Booking> allBookings = bookingRepository.findAll();
        BigDecimal totalRevenue = allBookings.stream()
                .filter(b -> b.getStatus() == BookingStatus.CONFIRMED
                        || b.getStatus() == BookingStatus.CHECKED_IN
                        || b.getStatus() == BookingStatus.CHECKED_OUT)
                .map(b -> b.getTotalAmount() != null ? b.getTotalAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Revenue by day (last 30 days)
        LocalDate today = LocalDate.now();
        LocalDate thirtyDaysAgo = today.minusDays(29);
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd");

        Map<String, Double> revenueByDayMap = new LinkedHashMap<>();
        Map<String, Long> bookingsByDayMap = new LinkedHashMap<>();
        for (int i = 29; i >= 0; i--) {
            String dateStr = today.minusDays(i).format(fmt);
            revenueByDayMap.put(dateStr, 0.0);
            bookingsByDayMap.put(dateStr, 0L);
        }

        allBookings.stream()
                .filter(b -> b.getBookedAt() != null
                        && !b.getBookedAt().toLocalDate().isBefore(thirtyDaysAgo)
                        && (b.getStatus() == BookingStatus.CONFIRMED
                            || b.getStatus() == BookingStatus.CHECKED_IN
                            || b.getStatus() == BookingStatus.CHECKED_OUT))
                .forEach(b -> {
                    String dateStr = b.getBookedAt().toLocalDate().format(fmt);
                    revenueByDayMap.merge(dateStr,
                            b.getTotalAmount() != null ? b.getTotalAmount().doubleValue() : 0.0,
                            Double::sum);
                    bookingsByDayMap.merge(dateStr, 1L, Long::sum);
                });

        List<DashboardStatsDto.RevenuePoint> revenueByDay = revenueByDayMap.entrySet().stream()
                .map(e -> DashboardStatsDto.RevenuePoint.builder()
                        .date(e.getKey())
                        .revenue(e.getValue())
                        .bookings(bookingsByDayMap.getOrDefault(e.getKey(), 0L))
                        .build())
                .collect(Collectors.toList());

        // Bookings by status
        List<DashboardStatsDto.StatusCount> bookingsByStatus = List.of(
                DashboardStatsDto.StatusCount.builder().status("CONFIRMED").count(confirmedBookings).build(),
                DashboardStatsDto.StatusCount.builder().status("PAYMENT_PENDING").count(pendingBookings).build(),
                DashboardStatsDto.StatusCount.builder().status("CHECKED_IN").count(checkedInBookings).build(),
                DashboardStatsDto.StatusCount.builder().status("CHECKED_OUT").count(checkedOutBookings).build(),
                DashboardStatsDto.StatusCount.builder().status("CANCELLED").count(cancelledBookings).build()
        );

        // Top hotels by revenue
        Map<UUID, Double> hotelRevMap = new HashMap<>();
        Map<UUID, Long> hotelBookingMap = new HashMap<>();
        allBookings.stream()
                .filter(b -> b.getStatus() == BookingStatus.CONFIRMED
                        || b.getStatus() == BookingStatus.CHECKED_IN
                        || b.getStatus() == BookingStatus.CHECKED_OUT)
                .forEach(b -> {
                    hotelRevMap.merge(b.getHotelId(),
                            b.getTotalAmount() != null ? b.getTotalAmount().doubleValue() : 0.0,
                            Double::sum);
                    hotelBookingMap.merge(b.getHotelId(), 1L, Long::sum);
                });

        List<DashboardStatsDto.HotelRevenue> topHotels = hotelRevMap.entrySet().stream()
                .sorted(Map.Entry.<UUID, Double>comparingByValue().reversed())
                .limit(5)
                .map(e -> {
                    Hotel hotel = hotelRepository.findById(e.getKey()).orElse(null);
                    return DashboardStatsDto.HotelRevenue.builder()
                            .name(hotel != null ? hotel.getName() : "Unknown")
                            .revenue(e.getValue())
                            .bookings(hotelBookingMap.getOrDefault(e.getKey(), 0L))
                            .build();
                })
                .collect(Collectors.toList());

        // Recent bookings (last 10)
        List<Object> recentBookings = bookingRepository
                .findAll(PageRequest.of(0, 10, Sort.by("bookedAt").descending()))
                .getContent().stream()
                .map(b -> {
                    Hotel hotel = hotelRepository.findById(b.getHotelId()).orElse(null);
                    RoomType rt = roomTypeRepository.findById(b.getRoomTypeId()).orElse(null);
                    Map<String, Object> dto = new LinkedHashMap<>();
                    dto.put("id", b.getId());
                    dto.put("bookingRef", b.getBookingReference());
                    dto.put("hotelName", hotel != null ? hotel.getName() : null);
                    dto.put("hotelImageUrl", hotel != null && hotel.getImages() != null && !hotel.getImages().isEmpty()
                            ? hotel.getImages().stream().filter(i -> Boolean.TRUE.equals(i.getIsPrimary()))
                                .findFirst().map(HotelImage::getImageUrl)
                                .orElse(hotel.getImages().get(0).getImageUrl())
                            : null);
                    dto.put("roomTypeName", rt != null ? rt.getName() : null);
                    dto.put("checkIn", b.getCheckIn());
                    dto.put("checkOut", b.getCheckOut());
                    dto.put("totalAmount", b.getTotalAmount());
                    dto.put("status", b.getStatus().name());
                    dto.put("bookedAt", b.getBookedAt());
                    return (Object) dto;
                })
                .collect(Collectors.toList());

        // Average booking value
        double avgBookingValue = totalBookings > 0
                ? totalRevenue.doubleValue() / Math.max(confirmedBookings + checkedInBookings + checkedOutBookings, 1)
                : 0.0;

        return DashboardStatsDto.builder()
                .totalBookings(totalBookings)
                .bookingsChange(0.0)
                .confirmedBookings(confirmedBookings)
                .pendingBookings(pendingBookings)
                .cancelledBookings(cancelledBookings)
                .totalRevenue(totalRevenue)
                .revenueChange(0.0)
                .revenueThisMonth(totalRevenue)
                .totalHotels(totalHotels)
                .activeHotels(activeHotels)
                .totalUsers(totalUsers)
                .totalGuests(totalUsers)
                .avgOccupancyRate(0.0)
                .occupancyRate(0.0)
                .avgBookingValue(avgBookingValue)
                .revenueByDay(revenueByDay)
                .bookingsByStatus(bookingsByStatus)
                .topHotels(topHotels)
                .recentBookings(recentBookings)
                .build();
    }
}
