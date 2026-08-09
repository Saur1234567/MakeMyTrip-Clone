package com.makemycrip.booking.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.geom.PageSize;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.kernel.pdf.canvas.draw.SolidLine;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.borders.Border;
import com.itextpdf.layout.element.*;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.makemycrip.booking.entity.Booking;
import com.makemycrip.booking.entity.BookingAddOn;
import com.makemycrip.common.exception.BusinessLogicException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;
import java.util.Collections;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class PdfInvoiceService {

    private static final DeviceRgb BRAND_BLUE = new DeviceRgb(26, 115, 232);
    private static final DeviceRgb LIGHT_GRAY_BG = new DeviceRgb(248, 250, 252);
    private static final DeviceRgb SECTION_HEADER_BG = new DeviceRgb(235, 242, 255);
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd MMM yyyy");

    private final ObjectMapper objectMapper;

    public byte[] generateInvoice(Booking booking) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            PdfWriter writer = new PdfWriter(baos);
            PdfDocument pdf = new PdfDocument(writer);
            Document doc = new Document(pdf, PageSize.A4);
            doc.setMargins(40, 50, 40, 50);

            // ── Header ────────────────────────────────────────────────────────
            Table header = new Table(UnitValue.createPercentArray(new float[]{60, 40}))
                    .setWidth(UnitValue.createPercentValue(100));

            Cell logoCell = new Cell().setBorder(Border.NO_BORDER);
            logoCell.add(new Paragraph("MakeMyCrip")
                    .setFontSize(22).setBold().setFontColor(BRAND_BLUE));
            logoCell.add(new Paragraph("Hotel Booking Invoice")
                    .setFontSize(11).setFontColor(ColorConstants.GRAY));
            header.addCell(logoCell);

            Cell invoiceInfoCell = new Cell().setBorder(Border.NO_BORDER)
                    .setTextAlignment(TextAlignment.RIGHT);
            invoiceInfoCell.add(new Paragraph("INVOICE")
                    .setFontSize(18).setBold().setFontColor(ColorConstants.DARK_GRAY));
            invoiceInfoCell.add(new Paragraph("Ref: " + booking.getBookingReference())
                    .setFontSize(10).setFontColor(ColorConstants.GRAY));
            if (booking.getBookedAt() != null) {
                invoiceInfoCell.add(new Paragraph("Date: " + booking.getBookedAt().format(DATE_FMT))
                        .setFontSize(10).setFontColor(ColorConstants.GRAY));
            }
            header.addCell(invoiceInfoCell);
            doc.add(header);

            SolidLine separatorLine = new SolidLine(2f);
            separatorLine.setColor(BRAND_BLUE);
            LineSeparator separator = new LineSeparator(separatorLine);
            separator.setMarginTop(10);
            separator.setMarginBottom(20);
            doc.add(separator);

            // ── Booking Details ───────────────────────────────────────────────
            doc.add(new Paragraph("Booking Details").setFontSize(13).setBold().setFontColor(BRAND_BLUE));

            Table detailsTable = new Table(UnitValue.createPercentArray(new float[]{50, 50}))
                    .setWidth(UnitValue.createPercentValue(100))
                    .setBackgroundColor(LIGHT_GRAY_BG)
                    .setPadding(10).setMarginBottom(15);

            addDetailRow(detailsTable, "Booking Ref", booking.getBookingReference());
            addDetailRow(detailsTable, "Check-in", booking.getCheckIn() != null
                    ? booking.getCheckIn().format(DateTimeFormatter.ofPattern("dd MMM yyyy")) : "");
            addDetailRow(detailsTable, "Check-out", booking.getCheckOut() != null
                    ? booking.getCheckOut().format(DateTimeFormatter.ofPattern("dd MMM yyyy")) : "");
            addDetailRow(detailsTable, "Guests", booking.getAdults() + " Adults" +
                    (booking.getChildren() > 0 ? ", " + booking.getChildren() + " Children" : ""));
            addDetailRow(detailsTable, "Status", booking.getStatus().name());
            doc.add(detailsTable);

            // ── Price Breakdown ───────────────────────────────────────────────
            doc.add(new Paragraph("Price Breakdown").setFontSize(13).setBold().setFontColor(BRAND_BLUE));

            Table priceTable = new Table(UnitValue.createPercentArray(new float[]{60, 40}))
                    .setWidth(UnitValue.createPercentValue(100)).setMarginBottom(10);

            // Parse structured priceBreakdown JSON if available
            Map<String, Object> pb = parsePriceBreakdown(booking.getPriceBreakdown());

            if (pb != null) {
                // Base price
                Object basePrice = pb.get("basePrice");
                if (basePrice == null) basePrice = pb.get("baseprice");
                if (basePrice != null) {
                    addPriceRow(priceTable, "Base price per night", "Rs. " + formatAmount(basePrice), false);
                }

                Object totalForStay = pb.get("totalForStay");
                if (totalForStay == null) totalForStay = pb.get("totalforstay");
                Object nights = pb.get("nights");
                String nightLabel = nights != null ? " (" + nights + " night" + (toDouble(nights) != 1 ? "s" : "") + ")" : "";
                if (totalForStay != null) {
                    addPriceRow(priceTable, "Room charges" + nightLabel, "Rs. " + formatAmount(totalForStay), false);
                } else {
                    addPriceRow(priceTable, "Room charges", "Rs. " + (booking.getBaseAmount() != null ? booking.getBaseAmount() : "0"), false);
                }

                // Adjustments (discounts / surcharges)
                List<Map<String, Object>> adjustments = getListField(pb, "adjustments");
                if (!adjustments.isEmpty()) {
                    addSectionHeader(priceTable, "Pricing Adjustments");
                    for (Map<String, Object> adj : adjustments) {
                        String adjName = getString(adj, "name", getString(adj, "ruleType", "Adjustment"));
                        String adjType = getString(adj, "type", "SURCHARGE");
                        double adjAmt = toDouble(adj.get("amount"));
                        String prefix = "DISCOUNT".equalsIgnoreCase(adjType) ? "- Rs. " : "+ Rs. ";
                        addPriceRow(priceTable, "  " + adjName, prefix + formatAmount(adjAmt), false);
                    }
                }

                // Subtotal after adjustments
                Object subtotal = pb.get("subtotalAfterAdjustments");
                if (subtotal == null) subtotal = pb.get("subtotalafteradjustments");
                if (subtotal != null && !adjustments.isEmpty()) {
                    addPriceRow(priceTable, "Subtotal after adjustments", "Rs. " + formatAmount(subtotal), true);
                }

            } else {
                // Fallback: use top-level booking fields
                addPriceRow(priceTable, "Room Charges",
                        "Rs. " + (booking.getBaseAmount() != null ? booking.getBaseAmount() : "0"), false);
            }

            // Add-ons
            if (booking.getAddOns() != null && !booking.getAddOns().isEmpty()) {
                boolean hasAddOns = booking.getAddOns().stream()
                        .anyMatch(a -> a.getTotalPrice() != null && a.getTotalPrice().doubleValue() > 0);
                if (hasAddOns) {
                    addSectionHeader(priceTable, "Add-ons");
                    for (BookingAddOn addOn : booking.getAddOns()) {
                        if (addOn.getTotalPrice() != null && addOn.getTotalPrice().doubleValue() > 0) {
                            addPriceRow(priceTable,
                                    "  " + addOn.getAddOnType().name().replace("_", " "),
                                    "Rs. " + addOn.getTotalPrice(), false);
                        }
                    }
                }
            }

            // Pricing-engine discount (loyalty / rules) — shown without coupon label
            if (booking.getDiscountAmount() != null && booking.getDiscountAmount().doubleValue() > 0) {
                addPriceRow(priceTable, "Loyalty / rule discount", "- Rs. " + booking.getDiscountAmount(), false);
            }

            // Coupon discount — stored separately in couponDiscount field
            if (booking.getCouponDiscount() != null && booking.getCouponDiscount().doubleValue() > 0) {
                String couponLabel = booking.getCouponCode() != null && !booking.getCouponCode().isBlank()
                        ? "Coupon discount (" + booking.getCouponCode() + ")"
                        : "Coupon discount";
                addPriceRow(priceTable, couponLabel, "- Rs. " + booking.getCouponDiscount(), false);
            }

            // Tax breakdown — use structured data if available, else fallback
            if (pb != null) {
                List<Map<String, Object>> taxBreakdown = getListField(pb, "taxBreakdown");
                if (taxBreakdown.isEmpty()) taxBreakdown = getListField(pb, "taxbreakdown");

                if (!taxBreakdown.isEmpty()) {
                    addSectionHeader(priceTable, "Taxes & Fees");
                    for (Map<String, Object> tax : taxBreakdown) {
                        String taxName = getString(tax, "name", "Tax");
                        double rate = toDouble(tax.get("rate"));
                        double taxAmt = toDouble(tax.get("amount"));
                        if (taxAmt > 0) {
                            String label = rate > 0
                                    ? "  " + taxName + " (" + formatRate(rate) + "%)"
                                    : "  " + taxName;
                            addPriceRow(priceTable, label, "Rs. " + formatAmount(taxAmt), false);
                        }
                    }
                } else if (booking.getTaxAmount() != null && booking.getTaxAmount().doubleValue() > 0) {
                    addPriceRow(priceTable, "Taxes & Fees (GST)",
                            "Rs. " + booking.getTaxAmount(), false);
                }
            } else if (booking.getTaxAmount() != null && booking.getTaxAmount().doubleValue() > 0) {
                addPriceRow(priceTable, "Taxes & Fees (GST)",
                        "Rs. " + booking.getTaxAmount(), false);
            }

            // Total row with colored background
            Cell totalLabelCell = new Cell()
                    .add(new Paragraph("TOTAL AMOUNT").setBold().setFontSize(13).setFontColor(ColorConstants.WHITE))
                    .setBackgroundColor(BRAND_BLUE).setPadding(8).setBorder(Border.NO_BORDER);
            Cell totalValCell = new Cell()
                    .add(new Paragraph("Rs. " + booking.getTotalAmount()).setBold().setFontSize(13).setFontColor(ColorConstants.WHITE))
                    .setBackgroundColor(BRAND_BLUE).setPadding(8).setBorder(Border.NO_BORDER)
                    .setTextAlignment(TextAlignment.RIGHT);
            priceTable.addCell(totalLabelCell);
            priceTable.addCell(totalValCell);

            doc.add(priceTable);

            // ── Footer ────────────────────────────────────────────────────────
            SolidLine footerLine = new SolidLine(1f);
            footerLine.setColor(new DeviceRgb(220, 220, 220));
            LineSeparator footerSep = new LineSeparator(footerLine);
            footerSep.setMarginTop(20);
            footerSep.setMarginBottom(10);
            doc.add(footerSep);

            doc.add(new Paragraph("Thank you for choosing MakeMyCrip!")
                    .setFontSize(11).setFontColor(BRAND_BLUE).setTextAlignment(TextAlignment.CENTER));
            doc.add(new Paragraph("For support: support@makemycrip.com | www.makemycrip.com")
                    .setFontSize(9).setFontColor(ColorConstants.GRAY).setTextAlignment(TextAlignment.CENTER));

            doc.close();
            return baos.toByteArray();
        } catch (Exception e) {
            log.error("Failed to generate PDF invoice for booking {}: {}", booking.getBookingReference(), e.getMessage(), e);
            throw new BusinessLogicException("Failed to generate invoice: " + e.getMessage());
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    private Map<String, Object> parsePriceBreakdown(String json) {
        if (json == null || json.isBlank()) return null;
        try {
            return objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            log.warn("Could not parse priceBreakdown JSON: {}", e.getMessage());
            return null;
        }
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> getListField(Map<String, Object> map, String key) {
        Object val = map.get(key);
        if (val instanceof List) {
            return (List<Map<String, Object>>) val;
        }
        return Collections.emptyList();
    }

    private String getString(Map<String, Object> map, String key, String defaultVal) {
        Object val = map.get(key);
        return val != null ? String.valueOf(val) : defaultVal;
    }

    private double toDouble(Object val) {
        if (val == null) return 0.0;
        if (val instanceof Number) return ((Number) val).doubleValue();
        try { return Double.parseDouble(String.valueOf(val)); } catch (Exception e) { return 0.0; }
    }

    private String formatAmount(Object val) {
        double d = toDouble(val);
        if (d == Math.floor(d)) return String.valueOf((long) d);
        return String.format("%.2f", d);
    }

    private String formatRate(double rate) {
        if (rate == Math.floor(rate)) return String.valueOf((long) rate);
        return String.format("%.1f", rate);
    }

    private void addSectionHeader(Table table, String title) {
        Cell cell = new Cell(1, 2)
                .add(new Paragraph(title).setFontSize(9).setBold().setFontColor(ColorConstants.GRAY))
                .setBackgroundColor(SECTION_HEADER_BG)
                .setBorder(Border.NO_BORDER)
                .setPaddingLeft(6).setPaddingTop(5).setPaddingBottom(3);
        table.addCell(cell);
    }

    private void addDetailRow(Table table, String label, String value) {
        table.addCell(new Cell().add(new Paragraph(label).setFontSize(10).setBold()
                .setFontColor(ColorConstants.GRAY)).setBorder(Border.NO_BORDER).setPadding(4));
        table.addCell(new Cell().add(new Paragraph(value != null ? value : "").setFontSize(10))
                .setBorder(Border.NO_BORDER).setPadding(4));
    }

    private void addPriceRow(Table table, String label, String amount, boolean bold) {
        Paragraph labelPara = new Paragraph(label).setFontSize(10);
        Paragraph amtPara = new Paragraph(amount).setFontSize(10);
        if (bold) {
            labelPara.setBold();
            amtPara.setBold();
        }
        table.addCell(new Cell().add(labelPara).setBorder(Border.NO_BORDER).setPadding(6));
        table.addCell(new Cell().add(amtPara).setBorder(Border.NO_BORDER).setPadding(6)
                .setTextAlignment(TextAlignment.RIGHT));
    }
}
