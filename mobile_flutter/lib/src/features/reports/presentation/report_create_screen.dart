import "dart:io";

import "package:flutter/material.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";
import "package:geolocator/geolocator.dart";
import "package:image_picker/image_picker.dart";

import "../data/report_service.dart";
import "../domain/report_models.dart";

class ReportCreateScreen extends ConsumerStatefulWidget {
  const ReportCreateScreen({super.key});

  @override
  ConsumerState<ReportCreateScreen> createState() => _ReportCreateScreenState();
}

class _ReportCreateScreenState extends ConsumerState<ReportCreateScreen> {
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _addressController = TextEditingController();

  final List<XFile> _images = <XFile>[];
  final ImagePicker _picker = ImagePicker();

  String _category = "SOLID_WASTE";
  bool _isAnonymous = false;
  double? _latitude;
  double? _longitude;
  bool _isSubmitting = false;

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    _addressController.dispose();
    super.dispose();
  }

  Future<void> _pickFromCamera() async {
    final picked =
        await _picker.pickImage(source: ImageSource.camera, imageQuality: 75);
    if (picked == null) {
      return;
    }

    if (_images.length >= 5) {
      _showMessage("Maximum of 5 images allowed.");
      return;
    }

    setState(() {
      _images.add(picked);
    });
  }

  Future<void> _pickFromGallery() async {
    final remaining = 5 - _images.length;
    if (remaining <= 0) {
      _showMessage("Maximum of 5 images allowed.");
      return;
    }

    final picked =
        await _picker.pickMultiImage(imageQuality: 75, limit: remaining);
    if (picked.isEmpty) {
      return;
    }

    setState(() {
      _images.addAll(picked.take(remaining));
    });
  }

  Future<void> _getCurrentLocation() async {
    final enabled = await Geolocator.isLocationServiceEnabled();
    if (!enabled) {
      _showMessage("Location services are disabled.");
      return;
    }

    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }

    if (permission == LocationPermission.denied ||
        permission == LocationPermission.deniedForever) {
      _showMessage("Location permission is required.");
      return;
    }

    final position = await Geolocator.getCurrentPosition(
      desiredAccuracy: LocationAccuracy.high,
    );

    setState(() {
      _latitude = position.latitude;
      _longitude = position.longitude;
    });
  }

  Future<void> _submitReport() async {
    final title = _titleController.text.trim();
    final description = _descriptionController.text.trim();
    final address = _addressController.text.trim();

    if (title.length < 5) {
      _showMessage("Title must be at least 5 characters.");
      return;
    }

    if (description.length < 20) {
      _showMessage("Description must be at least 20 characters.");
      return;
    }

    if (_latitude == null || _longitude == null) {
      _showMessage("Please capture your location first.");
      return;
    }

    setState(() => _isSubmitting = true);
    try {
      final reportService = ref.read(reportServiceProvider);

      final report = await reportService.createReport(
        title: title,
        description: description,
        category: _category,
        latitude: _latitude!,
        longitude: _longitude!,
        address: address.isEmpty ? null : address,
        isAnonymous: _isAnonymous,
      );

      if (_images.isNotEmpty) {
        await reportService.uploadReportImages(
          reportId: report.id,
          images: _images,
          type: "REPORT",
        );
      }

      _titleController.clear();
      _descriptionController.clear();
      _addressController.clear();

      setState(() {
        _images.clear();
        _isAnonymous = false;
        _category = "SOLID_WASTE";
      });

      _showMessage("Report submitted successfully.");
    } catch (error) {
      _showMessage(error.toString());
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }

  void _showMessage(String message) {
    if (!mounted) {
      return;
    }

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final categories = wasteCategoryLabels.entries.toList(growable: false);

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        TextField(
          controller: _titleController,
          decoration: const InputDecoration(
            labelText: "Title",
            border: OutlineInputBorder(),
          ),
          maxLength: 100,
        ),
        const SizedBox(height: 10),
        TextField(
          controller: _descriptionController,
          decoration: const InputDecoration(
            labelText: "Description",
            border: OutlineInputBorder(),
            alignLabelWithHint: true,
          ),
          minLines: 4,
          maxLines: 6,
        ),
        const SizedBox(height: 10),
        DropdownButtonFormField<String>(
          initialValue: _category,
          decoration: const InputDecoration(
            labelText: "Category",
            border: OutlineInputBorder(),
          ),
          items: categories
              .map(
                (entry) => DropdownMenuItem<String>(
                  value: entry.key,
                  child: Text(entry.value),
                ),
              )
              .toList(growable: false),
          onChanged: (value) {
            if (value == null) {
              return;
            }
            setState(() => _category = value);
          },
        ),
        const SizedBox(height: 10),
        TextField(
          controller: _addressController,
          decoration: const InputDecoration(
            labelText: "Address / Landmark",
            border: OutlineInputBorder(),
          ),
        ),
        const SizedBox(height: 12),
        SwitchListTile(
          title: const Text("Submit anonymously"),
          contentPadding: EdgeInsets.zero,
          value: _isAnonymous,
          onChanged: (value) => setState(() => _isAnonymous = value),
        ),
        const SizedBox(height: 8),
        OutlinedButton.icon(
          onPressed: _getCurrentLocation,
          icon: const Icon(Icons.my_location),
          label: Text(
            _latitude == null || _longitude == null
                ? "Capture Location"
                : "Location: ${_latitude!.toStringAsFixed(5)}, ${_longitude!.toStringAsFixed(5)}",
          ),
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(
              child: OutlinedButton.icon(
                onPressed: _pickFromCamera,
                icon: const Icon(Icons.photo_camera_outlined),
                label: const Text("Camera"),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: OutlinedButton.icon(
                onPressed: _pickFromGallery,
                icon: const Icon(Icons.image_outlined),
                label: const Text("Gallery"),
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        if (_images.isNotEmpty)
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _images
                .asMap()
                .entries
                .map(
                  (entry) => Stack(
                    clipBehavior: Clip.none,
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: Image.file(
                          File(entry.value.path),
                          width: 86,
                          height: 86,
                          fit: BoxFit.cover,
                        ),
                      ),
                      Positioned(
                        top: -8,
                        right: -8,
                        child: InkWell(
                          onTap: () {
                            setState(() {
                              _images.removeAt(entry.key);
                            });
                          },
                          child: const CircleAvatar(
                            radius: 11,
                            backgroundColor: Colors.red,
                            child: Icon(Icons.close,
                                size: 14, color: Colors.white),
                          ),
                        ),
                      ),
                    ],
                  ),
                )
                .toList(growable: false),
          ),
        const SizedBox(height: 18),
        FilledButton(
          onPressed: _isSubmitting ? null : _submitReport,
          child: Text(_isSubmitting ? "Submitting..." : "Submit Report"),
        ),
        const SizedBox(height: 20),
      ],
    );
  }
}
