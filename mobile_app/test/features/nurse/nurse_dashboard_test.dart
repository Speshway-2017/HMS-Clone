import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_app/features/nurse/screens/nurse_dashboard.dart';

void main() {
  testWidgets('Nurse Dashboard Smoke Test', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(400, 1600);
    tester.view.devicePixelRatio = 1.0;

    await tester.pumpWidget(
      const MaterialApp(
        home: MediaQuery(
          data: MediaQueryData(size: Size(400, 1600)),
          child: NurseDashboard(),
        ),
      ),
    );
    
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 500));

    // Verify Scaffold and BottomNavigationBar exist
    expect(find.byType(NurseDashboard), findsOneWidget);
    expect(find.byType(BottomNavigationBar), findsOneWidget);
    expect(find.text('Nurse Workspace'), findsOneWidget);

    addTearDown(tester.view.resetPhysicalSize);
  });
}
