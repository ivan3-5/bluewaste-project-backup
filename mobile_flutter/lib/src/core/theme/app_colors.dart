import "package:flutter/material.dart";

class AppColors {
  static const Color background = Color(0xFFFFFFFF);
  static const Color foreground = Color(0xFF020817);
  static const Color card = Color(0xFFFFFFFF);

  // Mirrors web --primary: hsl(210, 100%, 40%)
  static const Color primary = Color(0xFF0066CC);
  static const Color primaryForeground = Color(0xFFF8FAFC);

  static const Color secondary = Color(0xFFF1F5F9);
  static const Color secondaryForeground = Color(0xFF1E293B);

  static const Color muted = Color(0xFFF1F5F9);
  static const Color mutedForeground = Color(0xFF64748B);

  static const Color border = Color(0xFFE2E8F0);
  static const Color destructive = Color(0xFFEF4444);

  static const Color success = Color(0xFF22C55E);
  static const Color warning = Color(0xFFF59E0B);
  static const Color info = Color(0xFF3B82F6);
  static const Color purple = Color(0xFF8B5CF6);
  static const Color orange = Color(0xFFF97316);
  static const Color cyan = Color(0xFF06B6D4);
  static const Color olive = Color(0xFF84CC16);
  static const Color neutral = Color(0xFF6B7280);

  static Color statusColor(String status) {
    switch (status) {
      case "CLEANED":
        return success;
      case "IN_PROGRESS":
        return orange;
      case "VERIFIED":
        return info;
      case "CLEANUP_SCHEDULED":
        return purple;
      case "REJECTED":
        return destructive;
      default:
        return warning;
    }
  }

  static Color categoryColor(String category) {
    switch (category) {
      case "PLASTIC_WASTE":
        return info;
      case "ORGANIC_WASTE":
        return olive;
      case "GLASS_WASTE":
        return cyan;
      case "METAL_WASTE":
        return orange;
      case "PAPER_WASTE":
        return purple;
      default:
        return neutral;
    }
  }

  static Color tint(Color color, {double opacity = 0.12}) {
    return Color.alphaBlend(color.withValues(alpha: opacity), card);
  }
}
