import "package:flutter/material.dart";
import "../../reports/presentation/shared/reports_map_screen.dart";

class AdminMapScreen extends StatelessWidget {
  const AdminMapScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const ReportsMapScreen(
      assignedOnly: false,
    );
  }
}
