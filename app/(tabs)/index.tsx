import { Screen } from "../../components/Screen";
import { Placeholder } from "../../components/Placeholder";

export default function SearchScreen() {
  return (
    <Screen padded={false}>
      <Placeholder
        icon="search"
        title="Find a hotel"
        subtitle="Search near you for a great gym and a great bar. Real Google Places results land here in Phase 1."
        phase="Phase 1"
      />
    </Screen>
  );
}
