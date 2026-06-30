import { Screen } from "../../components/Screen";
import { Placeholder } from "../../components/Placeholder";

export default function MyLogScreen() {
  return (
    <Screen padded={false}>
      <Placeholder
        icon="book-outline"
        title="My Log"
        subtitle="Every hotel you rate or save shows up here with your own gym and bar scores. Arrives in Phase 2."
        phase="Phase 2"
      />
    </Screen>
  );
}
