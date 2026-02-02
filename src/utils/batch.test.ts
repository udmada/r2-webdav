import { describe, it, expect } from "vitest";
import { chunkArray } from "./batch";

describe("chunkArray", () => {
	it("should chunk array into specified size", () => {
		const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
		const result = chunkArray(input, 3);
		expect(result).toEqual([[1, 2, 3], [4, 5, 6], [7, 8, 9], [10]]);
	});

	it("should handle exact divisions", () => {
		const input = [1, 2, 3, 4, 5, 6];
		const result = chunkArray(input, 2);
		expect(result).toEqual([[1, 2], [3, 4], [5, 6]]);
	});

	it("should handle empty array", () => {
		const result = chunkArray([], 3);
		expect(result).toEqual([]);
	});

	it("should handle chunk size larger than array", () => {
		const input = [1, 2, 3];
		const result = chunkArray(input, 10);
		expect(result).toEqual([[1, 2, 3]]);
	});

	it("should handle chunk size of 1", () => {
		const input = [1, 2, 3];
		const result = chunkArray(input, 1);
		expect(result).toEqual([[1], [2], [3]]);
	});

	it("should handle R2 batch delete size limit (1000)", () => {
		const input = Array.from({ length: 2500 }, (_, i) => i);
		const result = chunkArray(input, 1000);
		expect(result).toHaveLength(3);
		expect(result[0]).toHaveLength(1000);
		expect(result[1]).toHaveLength(1000);
		expect(result[2]).toHaveLength(500);
	});
});
