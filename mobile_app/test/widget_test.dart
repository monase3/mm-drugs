import 'package:flutter_test/flutter_test.dart';
import 'package:mm_drugs_mobile/main.dart';

void main() {
  testWidgets('App loads and shows auth gate', (WidgetTester tester) async {
    await tester.pumpWidget(const MmDrugsApp());
    expect(find.byType(MmDrugsApp), findsOneWidget);
  });
}
