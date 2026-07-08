import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { Region, RegionId } from "@/lib/regions";

type RegionSwitcherProps = {
	regions: Region[];
	selectedRegionId: RegionId | null;
	onSelectedRegionIdChange: (regionId: RegionId) => void;
};

export function RegionSwitcher({
	regions,
	selectedRegionId,
	onSelectedRegionIdChange,
}: RegionSwitcherProps) {
	return (
		<Select
			value={selectedRegionId ?? undefined}
			onValueChange={(regionId) =>
				onSelectedRegionIdChange(regionId as RegionId)
			}
			disabled={regions.length === 0}
		>
			<SelectTrigger className="w-full min-w-52 sm:w-64" aria-label="District">
				<SelectValue placeholder="Select district" />
			</SelectTrigger>
			<SelectContent>
				<SelectGroup>
					{regions.map((region) => (
						<SelectItem key={region.id} value={region.id}>
							{region.name}
						</SelectItem>
					))}
				</SelectGroup>
			</SelectContent>
		</Select>
	);
}
