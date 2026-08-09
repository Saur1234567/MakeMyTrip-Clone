package com.makemycrip.auth.service;

import com.makemycrip.user.enums.DeviceType;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public class UserAgentParser {

    public Map<String, String> parse(String userAgent) {
        if (userAgent == null || userAgent.isBlank()) {
            return Map.of("browser", "Unknown", "os", "Unknown", "deviceName", "Unknown");
        }
        String ua = userAgent.toLowerCase();
        String browser = detectBrowser(ua, userAgent);
        String os = detectOs(ua);
        String deviceName = detectDeviceName(ua);
        return Map.of("browser", browser, "os", os, "deviceName", deviceName);
    }

    public DeviceType detectDeviceType(String userAgent) {
        if (userAgent == null) return DeviceType.DESKTOP;
        String ua = userAgent.toLowerCase();
        if (ua.contains("tablet") || ua.contains("ipad")) return DeviceType.TABLET;
        if (ua.contains("mobile") || ua.contains("android") || ua.contains("iphone")) return DeviceType.MOBILE;
        return DeviceType.DESKTOP;
    }

    private String detectBrowser(String ua, String original) {
        if (ua.contains("edg/")) return "Edge";
        if (ua.contains("opr/") || ua.contains("opera")) return "Opera";
        if (ua.contains("chrome")) return "Chrome";
        if (ua.contains("safari")) return "Safari";
        if (ua.contains("firefox")) return "Firefox";
        if (ua.contains("msie") || ua.contains("trident")) return "Internet Explorer";
        return "Unknown";
    }

    private String detectOs(String ua) {
        if (ua.contains("windows")) return "Windows";
        if (ua.contains("mac os x")) return "macOS";
        if (ua.contains("linux")) return "Linux";
        if (ua.contains("android")) return "Android";
        if (ua.contains("iphone") || ua.contains("ipad")) return "iOS";
        return "Unknown";
    }

    private String detectDeviceName(String ua) {
        if (ua.contains("iphone")) return "iPhone";
        if (ua.contains("ipad")) return "iPad";
        if (ua.contains("android")) return "Android Device";
        if (ua.contains("windows")) return "Windows PC";
        if (ua.contains("mac")) return "Mac";
        return "Unknown Device";
    }
}
