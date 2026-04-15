import "package:flutter/material.dart";

import "../../notifications/presentation/notifications_screen.dart";
import "../../profile/presentation/profile_screen.dart";
import "../../reports/presentation/reports_map_screen.dart";
import "../../reports/presentation/worker_tasks_screen.dart";

class WorkerShellScreen extends StatefulWidget {
  const WorkerShellScreen({super.key});

  @override
  State<WorkerShellScreen> createState() => _WorkerShellScreenState();
}

class _WorkerShellScreenState extends State<WorkerShellScreen> {
  int _index = 0;

  void _setTab(int value) {
    setState(() {
      _index = value;
    });
  }

  void _openProfile() {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => const ProfileScreen(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final pages = <Widget>[
      const WorkerTasksScreen(),
      const ReportsMapScreen(assignedOnly: true),
      const NotificationsScreen(),
    ];

    const titles = <String>["My Tasks", "Assigned Map", "Alerts"];

    return Scaffold(
      appBar: AppBar(
        title: Text(titles[_index]),
        actions: [
          IconButton(
            onPressed: _openProfile,
            icon: const Icon(Icons.person_outline),
          ),
        ],
      ),
      body: IndexedStack(index: _index, children: pages),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: _setTab,
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.assignment_outlined),
            label: "Tasks",
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
