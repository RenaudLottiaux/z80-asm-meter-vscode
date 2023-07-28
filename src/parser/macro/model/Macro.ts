import { MacroDefinition } from "./MacroDefinition";
import MeterableAggregation from "../../../model/MeterableAggregation";
import { extractRawInstructionFrom, parseTimingsLenient, parteIntLenient, undefinedIfNaN } from "../../../utils";
import Z80InstructionParser from "../../z80/Z80InstructionParser";

export class Macro extends MeterableAggregation {

	// User-provided information
	private instructionSets: string[];
	private providedName: string;
	private providedInstructions: string[] | undefined;
	private providedZ80Timing: number[] | undefined;
	private providedMsxTiming: number[] | undefined;
	private providedCpcTiming: number[] | undefined;
	private providedSize: number | undefined;

	// Derived information (will be cached for performance reasons)
	private ready: boolean = false;

	constructor(source: MacroDefinition, instructionSets: string[]) {
		super();

		this.providedName = source.name;
		this.providedInstructions = source.instructions;
		this.providedZ80Timing = parseTimingsLenient(source.z80);
		this.providedMsxTiming = parseTimingsLenient(source.msx);
		this.providedCpcTiming = parseTimingsLenient(source.cpc);
		this.providedSize = undefinedIfNaN(parteIntLenient(source.size));

		this.instructionSets = instructionSets;

		this.init();
	}

	/**
	 * @returns The name of the macro
	 */
	getInstruction(): string {

		return this.providedName;
	}

	/**
	 * @returns The Z80 timing, in time (T) cycles
	 */
	getZ80Timing(): number[] {
		if (this.providedZ80Timing !== undefined) {
			return this.providedZ80Timing;
		}
        this.init();
		return super.getZ80Timing();
	}

	/**
	 * @returns The Z80 timing with the M1 wait cycles required by the MSX standard
	 */
	getMsxTiming(): number[] {
		if (this.providedMsxTiming !== undefined) {
			return this.providedMsxTiming;
		}
		this.init();
		return super.getMsxTiming();
	}

	/**
	 * @returns The CPC timing, in NOPS
	 */
	getCpcTiming(): number[] {
		if (this.providedCpcTiming !== undefined) {
			return this.providedCpcTiming;
		}
		this.init();
		return super.getCpcTiming();
	}

	/**
	 * @returns The bytes
	 */
	getBytes(): string[] {
		this.init();
		const bytes = super.getBytes();
		if (bytes.length) {
			return bytes;
		}
		const size = this.getSize();
		return size
				? new Array(size).fill("n")
				: [];
	}

	/**
	 * @returns The size in bytes
	 */
	getSize(): number {
		if (this.providedSize !== undefined) {
			return this.providedSize;
		}
		return super.getSize();
	}

	private init(): void {

		// (sanity check)
		if (this.ready) {
			return;
		}

		if (this.providedInstructions !== undefined) {
			this.providedInstructions.forEach(rawPart => {
				const rawInstruction = extractRawInstructionFrom(rawPart);
				const instruction = Z80InstructionParser.instance.parseInstruction(rawInstruction, this.instructionSets);
				this.add(instruction, 1);
			});
		}

		this.ready = true;
	}
}
