import { Screen } from "../../components/Screen";
import { Placeholder } from "../../components/Placeholder";

export default function AddScreen() {
  return (
    <Screen padded={false}>
      <Placeholder
        icon="add-circle-outline"
        title="Rate a hotel"
        subtitle="Pick a hotel, tap your gym, bar, and overall scores — under 30 seconds. The rating flow arrives in Phase 2."
        phase="Phase 2"
      />
    </Screen>
  );
}
