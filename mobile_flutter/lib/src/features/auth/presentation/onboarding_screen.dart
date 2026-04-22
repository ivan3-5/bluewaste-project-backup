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
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [AppColors.secondary, AppColors.background],
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(
                  AppSpacing.md,
                  AppSpacing.xs,
                  AppSpacing.md,
                  0,
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    TextButton(
                      onPressed: widget.onGetStarted,
                      child: Text(_isLastPage ? "Continue" : "Skip"),
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
                padding: const EdgeInsets.fromLTRB(
                  AppSpacing.md,
                  AppSpacing.xs,
                  AppSpacing.md,
                  AppSpacing.lg,
                ),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: List<Widget>.generate(_pages.length, (index) {
                        final active = index == _pageIndex;
                        return AnimatedContainer(
                          duration: const Duration(milliseconds: 220),
                          margin: const EdgeInsets.symmetric(
                              horizontal: AppSpacing.xxs),
                          height: 8,
                          width: active ? 22 : 8,
                          decoration: BoxDecoration(
                            color: active
                                ? AppColors.primary
                                : AppColors.tint(
                                    AppColors.mutedForeground,
                                    opacity: 0.3,
                                  ),
                            borderRadius: BorderRadius.circular(999),
                          ),
                        );
                      }),
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton.icon(
                        onPressed: _goNext,
                        icon: Icon(
                          _isLastPage
                              ? Icons.login_rounded
                              : Icons.arrow_forward_rounded,
                        ),
                        label: Text(_isLastPage ? "Get Started" : "Next"),
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xxs),
                    Text(
                      "You can create an account or sign in on the next screen.",
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: AppColors.mutedForeground,
                          ),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
            ],
          ),
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
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.md,
        AppSpacing.sm,
        AppSpacing.md,
        AppSpacing.sm,
      ),
      child: Column(
        children: [
          Align(
            alignment: Alignment.centerLeft,
            child: Container(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.xs,
                vertical: AppSpacing.xxs,
              ),
              decoration: BoxDecoration(
                color: AppColors.tint(page.color),
                borderRadius: BorderRadius.circular(999),
              ),
              child: Text(
                "Step ${pageIndex + 1} of $totalPages",
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      color: page.color,
                      fontWeight: FontWeight.w700,
                    ),
              ),
            ),
          ),
          const Spacer(),
          CircleAvatar(
            radius: 34,
            backgroundColor: AppColors.tint(page.color, opacity: 0.18),
            child: Icon(page.icon, color: page.color, size: 32),
          ),
          const SizedBox(height: AppSpacing.md),
          Text(
            page.title,
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w800,
                ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: AppSpacing.xs),
          Text(
            page.description,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: AppColors.mutedForeground,
                  height: 1.4,
                ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: AppSpacing.sm),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(AppSpacing.sm),
            decoration: BoxDecoration(
              color: AppColors.card,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.border),
            ),
            child: Row(
              children: [
                Icon(Icons.check_circle_outline, color: page.color, size: 18),
                const SizedBox(width: AppSpacing.xs),
                Expanded(
                  child: Text(
                    page.highlight,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: AppColors.mutedForeground,
                          fontWeight: FontWeight.w600,
                        ),
                  ),
                ),
              ],
            ),
          ),
          const Spacer(flex: 2),
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
