import { Button } from "@/components/ui/button";
import type { WorklistFilter } from "@/lib/compliance-summary";

type WorklistFiltersProps = {
	options: { id: WorklistFilter; label: string; count: number }[];
	value: WorklistFilter;
	onValueChange: (filter: WorklistFilter) => void;
};

export function WorklistFilters({
	options,
	value,
	onValueChange,
}: WorklistFiltersProps) {
	return (
		<div className="flex flex-wrap gap-2">
			{options.map((option) => (
				<Button
					key={option.id}
					size="sm"
					variant={option.id === value ? "default" : "outline"}
					aria-pressed={option.id === value}
					disabled={option.count === 0 && option.id !== value}
					onClick={() => onValueChange(option.id)}
				>
					{option.label} ({option.count})
				</Button>
			))}
		</div>
	);
}
