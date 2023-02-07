import { MeterableCollection } from "./MeterableCollection";
import { extractMnemonicOf, extractOperandsOf } from "./utils";
import { Z80InstructionParser } from "./Z80InstructionParser";

export class SjasmplusRegisterListInstructionParser {

    // Singleton
    public static instance = new SjasmplusRegisterListInstructionParser();

    private constructor() {
    }

    public parse(instruction: string | undefined, instructionSets: string[]): MeterableCollection | undefined {

        if (!instruction) {
            return undefined;
        }

        // Register lists instructions
        const mnemonic = extractMnemonicOf(instruction);
        if ([ "PUSH", "POP", "INC", "DEC" ].indexOf(mnemonic) === -1) {
            return undefined;
        }

        const collection = new MeterableCollection();

        for (const operand of extractOperandsOf(instruction)) {
            if (operand === "") {
                continue;
            }
            const partialInstruction = `${mnemonic} ${operand}`;

            // Tries to parse Z80 instruction
            const z80Instruction = Z80InstructionParser.instance.parseInstruction(partialInstruction, instructionSets);
            if (!z80Instruction) {
                // (unknown mnemonic/instruction)
                return undefined;
            }

            collection.add(z80Instruction, 1);
        }
        return collection;
    }
}