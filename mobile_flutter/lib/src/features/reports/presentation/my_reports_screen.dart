import "dart:async";

import "package:flutter/material.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";
import "package:intl/intl.dart";

import "../data/report_service.dart";
import "../domain/report_models.dart";

class MyReportsScreen extends ConsumerStatefulWidget {
  const MyReportsScreen({super.key});

  @override
  ConsumerState<MyReportsScreen> createState() => _MyReportsScreenState();
}

class _MyReportsScreenState extends ConsumerState<MyReportsScreen> {
  final DateFormat _dateFormat = DateFormat("MMM d, yyyy");

  List<ReportRecord> _reports = const [];
  bool _loading = true;
  String _statusFilter = "";
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _loadReports();
    _timer = Timer.periodic(const Duration(seconds: 30), (_) => _loadReports());
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _loadReports() async {
    try {
      final service = ref.read(reportServiceProvider);
      final result = await service.getMyReports(
        page: 1,
        limit: 20,
        status: _statusFilter.isEmpty ? null : _statusFilter,
      );

      if (!mounted) {
        return;
      }
      setState(() {
        _reports = result.data;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) {
        return;
      }
      setState(() {
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final statuses = <DropdownMenuItem<String>>[
      const DropdownMenuItem(value: "", child: Text("All statuses")),
      ...statusLabels.entries.map(
        (entry) => DropdownMenuItem(value: entry.key, child: Text(entry.value)),
      ),
    ];

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 14, 16, 8),
          child: DropdownButtonFormField<String>(
            initialValue: _statusFilter,
            items: statuses,
            decoration: const InputDecoration(
              labelText: "Filter",
              border: OutlineInputBorder(),
            ),
            onChanged: (value) {
              setState(() {
                _statusFilter = value ?? "";
                _loading = true;
              });
              _loadReports();
            },
          ),
        ),
        Expanded(
          child: RefreshIndicator(
            onRefresh: _loadReports,
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _reports.isEmpty
                    ? const Center(child: Text("No reports found."))
                    : ListView.builder(
                        itemCount: _reports.length,
                        itemBuilder: (context, index) {
                          final report = _reports[index];
                          return Card(
                            margin: const EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 6,
                            ),
                            child: ListTile(
                              title: Text(report.title),
                              subtitle: Text(
                                "${statusLabels[report.status] ?? report.status}  •  ${_dateFormat.format(report.createdAt)}",
                              ),
                              trailing: Text(
                                wasteCategoryLabels[report.category] ??
                                    report.category,
                                style: Theme.of(context).textTheme.labelSmall,
                              ),
                            ),
                          );
                        },
                      ),
          ),
        ),
      ],
    );
  }
}
