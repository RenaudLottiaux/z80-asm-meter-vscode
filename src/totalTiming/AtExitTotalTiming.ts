import { config } from "../config";
import { Meterable } from "../model/Meterable";
import { isCallInstruction, isConditionalInstruction, isConditionalJumpOrRetInstruction, isJumpInstruction, isRetInstruction, isUnconditionalJumpOrRetInstruction } from "../utils/AssemblyUtils";
import { TotalTiming, TotalTimingMeterable } from "./TotalTiming";

export class AtExitTotalTiminsMeterable extends TotalTimingMeterable {

	readonly isLastInstructionRet: boolean;
	readonly isLastInstructionJump: boolean;
	readonly isLastInstructionCall: boolean;

	constructor(meterable: Meterable, lastInstruction: string) {
		super(meterable);

		this.isLastInstructionRet = isRetInstruction(lastInstruction);
		this.isLastInstructionJump = isJumpInstruction(lastInstruction);
		this.isLastInstructionCall = isCallInstruction(lastInstruction);
	}

	get name(): string {
		return "Timing to exit point";
	}

	get statusBarIcon(): string {
		return this.isLastInstructionRet ? config.timing.atExit.retIcon
			: this.isLastInstructionJump ? config.timing.atExit.jumpIcon
			: this.isLastInstructionCall ? config.timing.atExit.callIcon
			: ""; // (should never happen)
	}

	protected modifiedTimingsOf(timing: number[],
		i: number, n: number, instruction: string): number[] {

		// Last instruction?
		if (i === n - 1) {
			return isConditionalInstruction(instruction)
				? [timing[0], timing[0]]	// "Taken" timing
				: timing;
		}

		// Previous instruction
		return isConditionalJumpOrRetInstruction(instruction)
			? [timing[1], timing[1]]	// "Not taken" timing
			: timing;
	}
}

class AtExitTotalTiming implements TotalTiming {

	/**
	 * Conditionaly builds an instance of the "timing at exit" decorator
	 * @param meterable The meterable instance to be decorated
	 * @return The "timing at exit" decorator, or undefined
	 */
	applyTo(meterable: Meterable): AtExitTotalTiminsMeterable | undefined {

		// (for performance reasons)
		const meterables = meterable.flatten();

		if (!this.canDecorate(meterables)) {
			return undefined;
		}

		// Builds the "timing at exit" decorator
		const lastInstruction = meterables[meterables.length - 1].instruction;
		return new AtExitTotalTiminsMeterable(meterable, lastInstruction);
	}

	/**
	 * Checks if "timing at exit" decorator can apply to the meterable
	 * @param meterables The flattened meterables of the meterable instance to be decorated
	 * @return true if the "timing at exit" decorator can be applied
	 */
	private canDecorate(meterables: Meterable[]): boolean {

		if (!config.statusBar.totalTimings
			|| !(config.timing.atExit.retEnabled
				|| config.timing.atExit.jumpEnabled
				|| config.timing.atExit.callEnabled)) {
			return false;
		}

		// Length check
		const threshold = config.timing.atExit.threshold;
		if ((threshold > 0) && (meterables.length < threshold)) {
			return false;
		}

		const stopOnUnconditionalJump = config.timing.atExit.stopOnUnconditionalJump;

		// Checks the instructions
		let anyConditionalJump: boolean = false;
		// (reverse order for performance reasons: check last instruction first)
		for (let n = meterables.length, i = n - 1; i >= 0; i--) {
			const instruction = meterables[i].instruction;
			const lastInstruction = i === n - 1;

			if (lastInstruction) {

				// Last instruction must be ret/jump/call
				if (!(
					(config.timing.atExit.retEnabled && isRetInstruction(instruction))
					|| (config.timing.atExit.jumpEnabled && isJumpInstruction(instruction))
					|| (config.timing.atExit.callEnabled && isCallInstruction(instruction))
				)) {
					return false;
				}

				anyConditionalJump ||= isConditionalInstruction(instruction);

			} else {

				// No unconditional jump/ret before the last instruction
				if (stopOnUnconditionalJump
					&& isUnconditionalJumpOrRetInstruction(instruction)) {
					return false;
				}

				anyConditionalJump ||= isConditionalJumpOrRetInstruction(instruction);
			}
		}

		// At least one conditional jump (or call, for the last instruction)
		return anyConditionalJump
			|| !config.timing.atExit.requireConditional;
	}
}

export const atExitTotalTiming = new AtExitTotalTiming();
