import Meterable from "../../model/Meterable";
import { flatten } from "../../utils/MeterableUtils";
import { isConditionalJump, isUnconditionalJump } from "../../utils/AssemblyUtils";
import TimingDecorator from "./TimingDecorator";

export default class FlowDecorator extends TimingDecorator {

	static canDecorate(meterable: Meterable): boolean {

		// Length check
		const meterables: Meterable[] = flatten(meterable);
		if (meterables.length < 2) {
			return false;
		}

		// Checks the instructions
		let anyConditionalJump: boolean = false;
		for (let i = 0, n = meterables.length; i < n; i++) {
			const instruction = meterables[i].getInstruction();

			// No unconditional jumps
			if (isUnconditionalJump(instruction)) {
				return false;
			}

			anyConditionalJump ||= isConditionalJump(instruction);
		}

		// At least one conditional jump
		return anyConditionalJump;
	}

	/**
	 * Conditionaly builds an instance of the "last condition met" decorator
	 * @param meterable The meterable instance to be decorated
	 * @return The "last condition met" decorator, or the original meterable
	 */
	static of(meterable: Meterable): Meterable {

		// Builds the "last condition met" decorator
		return this.canDecorate(meterable)
			? new FlowDecorator(meterable)
			: meterable;
	}

	protected constructor(meterable: Meterable) {
		super(meterable);
	}

	protected modifiedTimingsOf(timing: number[],
		i: number, n: number, instruction: string): number[] {

		return isConditionalJump(instruction)
			? [timing[1], timing[1]]	// "Not taken" timings
			: timing;
	}
}
