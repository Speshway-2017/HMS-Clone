import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_app/main.dart';

void main() {
  testWidgets('Splash Screen smoke test', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const HMSMobileApp());

    // Verify that the Splash Screen title is present.
    expect(find.text('HMS Enterprise'), findsOneWidget);
    expect(find.text('MANAGED CLINICAL NETWORK'), findsOneWidget);

    // Pump frames to let the 2.2-second navigation timer expire and complete navigation
    await tester.pumpAndSettle(const Duration(milliseconds: 2500));
  });
}
