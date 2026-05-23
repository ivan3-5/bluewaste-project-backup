import "package:flutter/material.dart";

import "../../../core/theme/app_colors.dart";
import "../../../core/theme/app_spacing.dart";

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({
    super.key,
    required this.onGetStarted,
  });

  final VoidCallback onGetStarted;

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  static const List<_OnboardingPageData> _pages = [
    _OnboardingPageData(
      icon: Icons.campaign_outlined,
      color: AppColors.primary,
      title: "Report Waste Fast",
      description:
          "Submit incidents in a few taps with details that help field teams respond quickly.",
      highlight: "Clear reports improve response time.",
    ),
    _OnboardingPageData(
      icon: Icons.location_on_outlined,
      color: AppColors.info,
      title: "Pin Exact Locations",
      description:
          "Capture coordinates and landmarks so workers can locate and validate reports accurately.",
      highlight: "Accurate locations reduce delays.",
    ),
    _OnboardingPageData(
      icon: Icons.track_changes_outlined,
      color: AppColors.success,
      title: "Track Progress",
      description:
          "Monitor report status from pending to cleaned and stay informed through alerts.",
      highlight: "Stay updated every step of the way.",
    ),
  ];

  final PageController _pageController = PageController();
  int _pageIndex = 0;

  bool get _isLastPage => _pageIndex == _pages.length - 1;

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  void _goNext() {
    if (_isLastPage) {
      widget.onGetStarted();
      return;
    }

    _pageController.nextPage(
      duration: const Duration(milliseconds: 260),
      curve: Curves.easeOut,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.md,
                vertical: AppSpacing.sm,
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Image.asset(
                    'assets/logo-final.png',
                    height: 32,
                    errorBuilder: (context, error, stackTrace) =>
                        const SizedBox(height: 32),
                  ),
                  TextButton(
                    onPressed: widget.onGetStarted,
                    style: TextButton.styleFrom(
                      foregroundColor: AppColors.mutedForeground,
                      textStyle: const TextStyle(fontWeight: FontWeight.w600),
                    ),
                    child: Text(_isLastPage ? "Done" : "Skip"),
                  ),
                ],
              ),
            ),
            Expanded(
              child: PageView.builder(
                controller: _pageController,
                itemCount: _pages.length,
                onPageChanged: (index) {
                  setState(() => _pageIndex = index);
                },
                itemBuilder: (context, index) {
                  final page = _pages[index];
                  return _OnboardingPage(
                    page: page,
                    pageIndex: index,
                    totalPages: _pages.length,
                  );
                },
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(AppSpacing.xl),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: List<Widget>.generate(_pages.length, (index) {
                      final active = index == _pageIndex;
                      return AnimatedContainer(
                        duration: const Duration(milliseconds: 300),
                        curve: Curves.easeInOutCubic,
                        margin: const EdgeInsets.symmetric(horizontal: 4),
                        height: 6,
                        width: active ? 28 : 12,
                        decoration: BoxDecoration(
                          color: active
                              ? AppColors.primary
                              : AppColors.border,
                          borderRadius: BorderRadius.circular(12),
                        ),
                      );
                    }),
                  ),
                  const SizedBox(height: AppSpacing.xl),
                  SizedBox(
                    width: double.infinity,
                    height: 56,
                    child: FilledButton(
                      style: FilledButton.styleFrom(
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                        elevation: 0,
                        backgroundColor: AppColors.primary,
                      ),
                      onPressed: _goNext,
                      child: Text(
                        _isLastPage ? "Get Started" : "Continue",
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _OnboardingPage extends StatelessWidget {
  const _OnboardingPage({
    required this.page,
    required this.pageIndex,
    required this.totalPages,
  });

  final _OnboardingPageData page;
  final int pageIndex;
  final int totalPages;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xl),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: AppColors.tint(page.color, opacity: 0.1),
              borderRadius: BorderRadius.circular(32),
            ),
            child: Icon(
              page.icon,
              color: page.color,
              size: 80,
            ),
          ),
          const SizedBox(height: 48),
          Text(
            page.title,
            style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                  fontWeight: FontWeight.w800,
                  color: AppColors.foreground,
                  letterSpacing: -0.5,
                ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),
          Text(
            page.description,
            style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                  color: AppColors.mutedForeground,
                  height: 1.5,
                ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 32),
          Container(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.md,
              vertical: AppSpacing.sm,
            ),
            decoration: BoxDecoration(
              color: AppColors.secondary,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  Icons.check_circle_rounded,
                  color: page.color,
                  size: 20,
                ),
                const SizedBox(width: AppSpacing.sm),
                Text(
                  page.highlight,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: AppColors.foreground,
                        fontWeight: FontWeight.w600,
                      ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _OnboardingPageData {
  const _OnboardingPageData({
    required this.icon,
    required this.color,
    required this.title,
    required this.description,
    required this.highlight,
  });

  final IconData icon;
  final Color color;
  final String title;
  final String description;
  final String highlight;
}
