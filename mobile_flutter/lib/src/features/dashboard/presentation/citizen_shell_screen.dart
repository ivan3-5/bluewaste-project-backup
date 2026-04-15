import "package:flutter/material.dart";

import "../../notifications/presentation/notifications_screen.dart";
import "../../profile/presentation/profile_screen.dart";
import "../../reports/presentation/citizen_home_screen.dart";
import "../../reports/presentation/my_reports_screen.dart";
import "../../reports/presentation/report_create_screen.dart";
import "../../reports/presentation/reports_map_screen.dart";

class CitizenShellScreen extends StatefulWidget {
  const CitizenShellScreen({super.key});

  @override
  State<CitizenShellScreen> createState() => _CitizenShellScreenState();
}

class _CitizenShellScreenState extends State<CitizenShellScreen> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    final pages = <Widget>[
      CitizenHomeScreen(
        onSelectTab: (tab) => setState(() => _index = tab),
      ),
      const ReportCreateScreen(),
      const MyReportsScreen(),
      const ReportsMapScreen(),
      const NotificationsScreen(),
    ];

    const titles = <String>[
      "Home",
      "Submit Report",
      "My Reports",
      "Map",
      "Notifications",
    ];

    return Scaffold(
      appBar: AppBar(
        title: Text(titles[_index]),
        actions: [
          IconButton(
            icon: const Icon(Icons.person_outline),
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) => const ProfileScreen(),
                ),
              );
            },
          ),
        ],
      ),
      body: IndexedStack(index: _index, children: pages),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (value) => setState(() => _index = value),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_outlined), label: "Home"),
          NavigationDestination(
            icon: Icon(Icons.add_circle_outline),
            label: "Report",
          ),
          NavigationDestination(
            icon: Icon(Icons.list_alt_outlined),
            label: "My Reports",
          ),
          NavigationDestination(icon: Icon(Icons.map_outlined), label: "Map"),
          NavigationDestination(
            icon: Icon(Icons.notifications_outlined),
            label: "Alerts",
          ),
        ],
      ),
    );
  }
}
