import * as assert from "assert";
import * as fs from "fs";

import * as qub from "../source/Qub";

suite("qub", () => {
    suite("quote()", () => {
        test("with null", () => {
            assert.deepStrictEqual(qub.quote(null), "null");
        });

        test("with undefined", () => {
            assert.deepStrictEqual(qub.quote(undefined), "undefined");
        });

        test(`with ""`, () => {
            assert.deepStrictEqual(qub.quote(``), `""`);
        });

        test(`with "cats"`, () => {
            assert.deepStrictEqual(qub.quote("cats"), `"cats"`);
        });
    });

    suite("escape()", () => {
        test("with null", () => {
            assert.deepStrictEqual(qub.escape(null), null);
        });

        test("with undefined", () => {
            assert.deepStrictEqual(qub.escape(undefined), undefined);
        });

        test(`with ""`, () => {
            assert.deepStrictEqual(qub.escape(``), ``);
        });

        test(`with "cats"`, () => {
            assert.deepStrictEqual(qub.escape("cats"), "cats");
        });

        test(`with "cat's"`, () => {
            assert.deepStrictEqual(qub.escape("cat's"), "cat's");
        });

        test(`with "\\tcat's"`, () => {
            assert.deepStrictEqual(qub.escape("\tcat's"), "\\tcat's");
        });

        test(`with "\\ncat's"`, () => {
            assert.deepStrictEqual(qub.escape("\ncat's"), "\\ncat's");
        });

        test(`with "\\rcat's"`, () => {
            assert.deepStrictEqual(qub.escape("\rcat's"), "\\rcat's");
        });
    });

    suite("isDefined()", () => {
        test("with null", () => {
            assert.deepStrictEqual(qub.isDefined(null), false);
        });

        test("with undefined", () => {
            assert.deepStrictEqual(qub.isDefined(undefined), false);
        });

        test(`with ""`, () => {
            assert.deepStrictEqual(qub.isDefined(""), true);
        });

        test(`with 0`, () => {
            assert.deepStrictEqual(qub.isDefined(0), true);
        });

        test(`with false`, () => {
            assert.deepStrictEqual(qub.isDefined(false), true);
        });

        test(`with true`, () => {
            assert.deepStrictEqual(qub.isDefined(true), true);
        });
    });

    suite("getLength()", () => {
        function getLengthTest(value: any[] | string, expectedLength: number): void {
            test(`with ${typeof value === "string" ? qub.quote(value) : JSON.stringify(value)}`, () => {
                assert.deepStrictEqual(qub.getLength(value), expectedLength);
            });
        }

        getLengthTest(undefined, 0);
        getLengthTest(null, 0);
        getLengthTest("", 0);
        getLengthTest("hello", 5);
        getLengthTest([], 0);
        getLengthTest([50], 1);
        getLengthTest([50, 'test'], 2);
    });

    suite("getCombinedLength()", () => {
        test("with null", () => {
            assert.deepStrictEqual(qub.getCombinedLength(null), 0);
        });

        test("with undefined", () => {
            assert.deepStrictEqual(qub.getCombinedLength(undefined), 0);
        });

        test("with empty array", () => {
            assert.deepStrictEqual(qub.getCombinedLength([]), 0);
        });

        test("with one value", () => {
            assert.deepStrictEqual(qub.getCombinedLength(
                [
                    { getLength(): number { return 7; } }
                ]),
                7);
        });

        test("with multiple values", () => {
            assert.deepStrictEqual(qub.getCombinedLength(
                [
                    { getLength(): number { return 2 } },
                    { getLength(): number { return 7 } }
                ]),
                9);
        });

        test("with non-contiguous multiple values", () => {
            assert.deepStrictEqual(qub.getContiguousLength(
                [
                    {
                        startIndex: 5,
                        afterEndIndex: 10
                    },
                    {
                        startIndex: 13,
                        afterEndIndex: 20
                    }
                ]),
                15);
        });
    });

    suite("getContiguousLength()", () => {
        function getContiguousLengthTest(values: { startIndex: number, afterEndIndex: number }[] | qub.Iterable<{ startIndex: number, afterEndIndex: number }>, expectedLength: number = 0, valuesDescription: string = JSON.stringify(values)): void {
            test(`with ${valuesDescription}`, () => {
                assert.deepStrictEqual(qub.getContiguousLength(values), expectedLength);
            });
        }

        getContiguousLengthTest(null);
        getContiguousLengthTest(undefined);
        getContiguousLengthTest([]);
        getContiguousLengthTest(new qub.ArrayList<{ startIndex: number, afterEndIndex: number }>());
        getContiguousLengthTest([{ startIndex: 5, afterEndIndex: 10 }], 5, "array with one value");
        getContiguousLengthTest(new qub.ArrayList([{ startIndex: 5, afterEndIndex: 10 }]), 5, "ArrayList with one value");
        getContiguousLengthTest(
            [
                { startIndex: 5, afterEndIndex: 10 },
                { startIndex: 10, afterEndIndex: 13 }
            ],
            8,
            "array with multiple values");
        getContiguousLengthTest(
            new qub.ArrayList([
                { startIndex: 5, afterEndIndex: 10 },
                { startIndex: 10, afterEndIndex: 13 }
            ]),
            8,
            "ArrayList with multiple values");
        getContiguousLengthTest(
            [
                { startIndex: 5, afterEndIndex: 10 },
                { startIndex: 13, afterEndIndex: 20 }
            ],
            15,
            "array with non-contiguous multiple values");
        getContiguousLengthTest(
            new qub.ArrayList([
                { startIndex: 5, afterEndIndex: 10 },
                { startIndex: 13, afterEndIndex: 20 }
            ]),
            15,
            "ArrayList with non-contiguous multiple values");
    });

    suite("getCombinedText()", () => {
        test("with null", () => {
            assert.deepStrictEqual(qub.getCombinedText(null), "");
        });

        test("with undefined", () => {
            assert.deepStrictEqual(qub.getCombinedText(undefined), "");
        });

        test("with empty array", () => {
            assert.deepStrictEqual(qub.getCombinedText([]), "");
        });

        test("with one value", () => {
            assert.deepStrictEqual(qub.getCombinedText(["hello"]), "hello");
        });

        test("with multiple values", () => {
            assert.deepStrictEqual(qub.getCombinedText(["hello", 5, false]), "hello5false");
        });
    });

    suite("clone()", () => {
        function cloneTest(value: any): void {
            test(`with ${qub.quote(qub.escape(JSON.stringify(value)))}`, () => {
                // Equal contents
                assert.deepStrictEqual(qub.clone(value), value);

                if (value instanceof Array || value instanceof Object) {
                    // Not same memory location
                    assert.notEqual(qub.clone(value), value);
                }
            });
        }

        cloneTest(null);
        cloneTest(undefined);
        cloneTest(true);
        cloneTest(false);
        cloneTest(0);
        cloneTest(5);
        cloneTest(-12);
        cloneTest("");
        cloneTest("hello");
        cloneTest({});
        cloneTest({ a: 0, b: "1" });
        cloneTest({ a: { b: "1" } });
        cloneTest([]);
        cloneTest([false, 0, ""]);
        cloneTest([[], []]);
    });

    suite("cloneArray()", () => {
        function cloneArrayTest(value: any[]): void {
            test(`with ${JSON.stringify(value)}`, () => {
                // Equal contents
                assert.deepStrictEqual(qub.cloneArray(value), value);

                if (value instanceof Array) {
                    // Not same memory location
                    assert.notEqual(qub.cloneArray(value), value);
                }
            });
        }

        cloneArrayTest(undefined);
        cloneArrayTest(null);
        cloneArrayTest([]);
        cloneArrayTest([false]);
        cloneArrayTest([[[[]]]]);
    });

    test("getPackageJson()", () => {
        const packageJson: any = qub.getPackageJson();
        assert(packageJson);
    });

    suite("endsWith()", () => {
        function endsWithTest(value: string, suffix: string, expected: boolean): void {
            test(`with ${qub.escapeAndQuote(value)} and ${qub.escapeAndQuote(suffix)}`, () => {
                assert.deepStrictEqual(qub.endsWith(value, suffix), expected);
            });
        }

        endsWithTest(undefined, undefined, false);
        endsWithTest(undefined, null, false);
        endsWithTest(undefined, "", false);
        endsWithTest(undefined, "les", false);

        endsWithTest(null, undefined, false);
        endsWithTest(null, null, false);
        endsWithTest(null, "", false);
        endsWithTest(null, "les", false);

        endsWithTest("", undefined, false);
        endsWithTest("", null, false);
        endsWithTest("", "", false);
        endsWithTest("", "les", false);

        endsWithTest("bananas", undefined, false);
        endsWithTest("bananas", null, false);
        endsWithTest("bananas", "", false);
        endsWithTest("bananas", "les", false);

        endsWithTest("apples", undefined, false);
        endsWithTest("apples", null, false);
        endsWithTest("apples", "", false);
        endsWithTest("apples", "les", true);
        endsWithTest("les", "les", true);
        endsWithTest("es", "les", false);
    });

    suite("contains()", () => {
        function containsTest(value: string, searchString: string, expected: boolean): void {
            test(`with ${qub.escapeAndQuote(value)} and ${qub.escapeAndQuote(searchString)}`, () => {
                assert.deepStrictEqual(qub.contains(value, searchString), expected);
            });
        }

        containsTest(undefined, undefined, false);
        containsTest(undefined, null, false);
        containsTest(undefined, "", false);
        containsTest(undefined, "les", false);

        containsTest(null, undefined, false);
        containsTest(null, null, false);
        containsTest(null, "", false);
        containsTest(null, "les", false);

        containsTest("", undefined, false);
        containsTest("", null, false);
        containsTest("", "", false);
        containsTest("", "les", false);

        containsTest("bananas", undefined, false);
        containsTest("bananas", null, false);
        containsTest("bananas", "", false);
        containsTest("bananas", "les", false);

        containsTest("apples", undefined, false);
        containsTest("apples", null, false);
        containsTest("apples", "", false);
        containsTest("apples", "les", true);
        containsTest("apples", "pl", true);
        containsTest("apples", "app", true);
        containsTest("les", "les", true);
        containsTest("es", "les", false);
    });

    test("repeat()", () => {
        assert.deepStrictEqual(qub.repeat(undefined, undefined), "");
        assert.deepStrictEqual(qub.repeat(undefined, null), "");
        assert.deepStrictEqual(qub.repeat(undefined, 0), "");
        assert.deepStrictEqual(qub.repeat(undefined, 5), "");
        assert.deepStrictEqual(qub.repeat(null, undefined), "");
        assert.deepStrictEqual(qub.repeat(null, null), "");
        assert.deepStrictEqual(qub.repeat(null, 0), "");
        assert.deepStrictEqual(qub.repeat(null, 4), "");
        assert.deepStrictEqual(qub.repeat("", undefined), "");
        assert.deepStrictEqual(qub.repeat("", null), "");
        assert.deepStrictEqual(qub.repeat("", 0), "");
        assert.deepStrictEqual(qub.repeat("", 2), "");
        assert.deepStrictEqual(qub.repeat("a", undefined), "");
        assert.deepStrictEqual(qub.repeat("a", null), "");
        assert.deepStrictEqual(qub.repeat("a", 0), "");
        assert.deepStrictEqual(qub.repeat("a", 1), "a");
        assert.deepStrictEqual(qub.repeat("a", 3), "aaa");
        assert.deepStrictEqual(qub.repeat("ab", undefined), "");
        assert.deepStrictEqual(qub.repeat("ab", null), "");
        assert.deepStrictEqual(qub.repeat("ab", 0), "");
        assert.deepStrictEqual(qub.repeat("ab", 1), "ab");
        assert.deepStrictEqual(qub.repeat("ab", 3), "ababab");
    });

    suite("getLineIndex()", () => {
        function getLineIndexTest(text: string, characterIndex: number, expectedLineIndex: number): void {
            test(`with ${qub.escapeAndQuote(text)} and characterIndex ${characterIndex}`, () => {
                assert.deepStrictEqual(qub.getLineIndex(text, characterIndex), expectedLineIndex);
            });
        }

        getLineIndexTest(undefined, undefined, undefined);
        getLineIndexTest(undefined, null, undefined);
        getLineIndexTest(undefined, -1, undefined);
        getLineIndexTest(undefined, 0, undefined);
        getLineIndexTest(null, undefined, undefined);
        getLineIndexTest(null, null, undefined);
        getLineIndexTest(null, -1, undefined);
        getLineIndexTest(null, 0, undefined);
        getLineIndexTest("", undefined, undefined);
        getLineIndexTest("", null, undefined);
        getLineIndexTest("", -1, undefined);
        getLineIndexTest("", 0, 0);
        getLineIndexTest("", 5, 0);
        getLineIndexTest("abc", undefined, undefined);
        getLineIndexTest("abc", null, undefined);
        getLineIndexTest("abc", -1, undefined);
        getLineIndexTest("abc", 0, 0);
        getLineIndexTest("abc", 2, 0);
        getLineIndexTest("ab\nc", 0, 0);
        getLineIndexTest("ab\nc", 1, 0);
        getLineIndexTest("ab\nc", 2, 0);
        getLineIndexTest("ab\nc", 3, 1);
        getLineIndexTest("ab\nc", 4, 1);
        getLineIndexTest("ab\nc", 10, 1);
    });

    suite("getColumnIndex()", () => {
        function getColumnIndexTest(text: string, characterIndex: number, expectedLineIndex: number): void {
            test(`with ${qub.escapeAndQuote(text)} and characterIndex ${characterIndex}`, () => {
                assert.deepStrictEqual(qub.getColumnIndex(text, characterIndex), expectedLineIndex);
            });
        }

        getColumnIndexTest(undefined, undefined, undefined);
        getColumnIndexTest(undefined, null, undefined);
        getColumnIndexTest(undefined, -1, undefined);
        getColumnIndexTest(undefined, 0, undefined);
        getColumnIndexTest(null, undefined, undefined);
        getColumnIndexTest(null, null, undefined);
        getColumnIndexTest(null, -1, undefined);
        getColumnIndexTest(null, 0, undefined);
        getColumnIndexTest("", undefined, undefined);
        getColumnIndexTest("", null, undefined);
        getColumnIndexTest("", -1, undefined);
        getColumnIndexTest("", 0, 0);
        getColumnIndexTest("", 5, 5);
        getColumnIndexTest("abc", undefined, undefined);
        getColumnIndexTest("abc", null, undefined);
        getColumnIndexTest("abc", -1, undefined);
        getColumnIndexTest("abc", 0, 0);
        getColumnIndexTest("abc", 2, 2);
        getColumnIndexTest("ab\nc", 0, 0);
        getColumnIndexTest("ab\nc", 1, 1);
        getColumnIndexTest("ab\nc", 2, 2);
        getColumnIndexTest("ab\nc", 3, 0);
        getColumnIndexTest("ab\nc", 4, 1);
        getColumnIndexTest("ab\nc", 10, 7);
    });

    suite("getStartIndex()", () => {
        test("with undefined", () => {
            assert.deepStrictEqual(qub.getStartIndex(undefined), undefined);
        });

        test("with null", () => {
            assert.deepStrictEqual(qub.getStartIndex(null), undefined);
        });

        test("with empty array", () => {
            assert.deepStrictEqual(qub.getStartIndex([]), undefined);
        });

        test("with single-valued array", () => {
            assert.deepStrictEqual(qub.getStartIndex([{ startIndex: 20 }]), 20);
        });

        test("with multi-valued array", () => {
            assert.deepStrictEqual(qub.getStartIndex([{ startIndex: 7 }, { startIndex: 20 }]), 7);
        });

        test("with empty Iterable", () => {
            const values = new qub.ArrayList<qub.HasStartIndex>();
            assert.deepStrictEqual(qub.getStartIndex(values), undefined);
        });

        test("with single-valued Iterable", () => {
            const values = new qub.ArrayList<qub.HasStartIndex>([{ startIndex: 22 }]);
            assert.deepStrictEqual(qub.getStartIndex(values), 22);
        });

        test("with multi-valued Iterable", () => {
            const values = new qub.ArrayList<qub.HasStartIndex>([{ startIndex: 3 }, { startIndex: 9 }]);
            assert.deepStrictEqual(qub.getStartIndex(values), 3);
        });
    });

    suite("getAfterEndIndex()", () => {
        test("with undefined", () => {
            assert.deepStrictEqual(qub.getAfterEndIndex(undefined), undefined);
        });

        test("with null", () => {
            assert.deepStrictEqual(qub.getAfterEndIndex(null), undefined);
        });

        test("with empty array", () => {
            assert.deepStrictEqual(qub.getAfterEndIndex([]), undefined);
        });

        test("with single-valued array", () => {
            assert.deepStrictEqual(qub.getAfterEndIndex([{ afterEndIndex: 20 }]), 20);
        });

        test("with multi-valued array", () => {
            assert.deepStrictEqual(qub.getAfterEndIndex([{ afterEndIndex: 7 }, { afterEndIndex: 29 }]), 29);
        });

        test("with empty Iterable", () => {
            const values = new qub.ArrayList<qub.HasAfterEndIndex>();
            assert.deepStrictEqual(qub.getAfterEndIndex(values), undefined);
        });

        test("with single-valued Iterable", () => {
            const values = new qub.ArrayList<qub.HasAfterEndIndex>([{ afterEndIndex: 22 }]);
            assert.deepStrictEqual(qub.getAfterEndIndex(values), 22);
        });

        test("with multi-valued Iterable", () => {
            const values = new qub.ArrayList<qub.HasAfterEndIndex>([{ afterEndIndex: 3 }, { afterEndIndex: 9 }]);
            assert.deepStrictEqual(qub.getAfterEndIndex(values), 9);
        });
    });

    suite("getSpan()", () => {
        test("with undefined", () => {
            assert.deepStrictEqual(qub.getSpan(undefined), undefined);
        });

        test("with null", () => {
            assert.deepStrictEqual(qub.getSpan(null), undefined);
        });

        test("with empty array", () => {
            assert.deepStrictEqual(qub.getSpan([]), undefined);
        });

        test("with single-valued array", () => {
            assert.deepStrictEqual(qub.getSpan([{ startIndex: 5, afterEndIndex: 20 }]), new qub.Span(5, 15));
        });

        test("with multi-valued array", () => {
            assert.deepStrictEqual(qub.getSpan([{ startIndex: 1, afterEndIndex: 7 }, { startIndex: 8, afterEndIndex: 29 }]), new qub.Span(1, 28));
        });

        test("with empty Iterable", () => {
            const values = new qub.ArrayList<qub.HasStartIndexAndAfterEndIndex>();
            assert.deepStrictEqual(qub.getSpan(values), undefined);
        });

        test("with single-valued Iterable", () => {
            const values = new qub.ArrayList<qub.HasStartIndexAndAfterEndIndex>([{ startIndex: 20, afterEndIndex: 22 }]);
            assert.deepStrictEqual(qub.getSpan(values), new qub.Span(20, 2));
        });

        test("with multi-valued Iterable", () => {
            const values = new qub.ArrayList<qub.HasStartIndexAndAfterEndIndex>([{ startIndex: 2, afterEndIndex: 3 }, { startIndex: 4, afterEndIndex: 9 }]);
            assert.deepStrictEqual(qub.getSpan(values), new qub.Span(2, 7));
        });
    });

    suite("ArrayList", () => {
        suite("constructor", () => {
            function constructorTest(initialValues: string[], expectedCount: number): void {
                test(`with ${JSON.stringify(initialValues)} and ${expectedCount}`, () => {
                    const al = new qub.ArrayList<string>(initialValues);
                    assert.deepStrictEqual(al.getCount(), expectedCount);
                    for (let i = 0; i < expectedCount; ++i) {
                        assert.deepStrictEqual(al.get(i), initialValues[i]);
                    }
                });
            }

            constructorTest(undefined, 0);
            constructorTest(null, 0);
            constructorTest([], 0);
            constructorTest(["a", "b", "c"], 3);
        });

        suite("iterate()", () => {
            function iterateTest(initialValues: string[]): void {
                test(`with ${JSON.stringify(initialValues)}`, () => {
                    const al = new qub.ArrayList<string>(initialValues);

                    const i = al.iterate();
                    assert.deepStrictEqual(i.hasStarted(), false);
                    assert.deepStrictEqual(i.hasCurrent(), false);

                    const initialValuesCount: number = qub.getLength(initialValues);
                    assert.deepStrictEqual(i.next(), initialValuesCount > 0);

                    if (initialValues) {
                        for (let index = 0; index < initialValuesCount; ++index) {
                            assert.deepStrictEqual(i.hasStarted(), true);
                            assert.deepStrictEqual(i.hasCurrent(), true);
                            assert.deepStrictEqual(i.getCurrent(), initialValues[index]);
                            assert.deepStrictEqual(i.next(), index < initialValuesCount - 1);
                        }
                    }

                    assert.deepStrictEqual(i.hasStarted(), true);
                    assert.deepStrictEqual(i.hasCurrent(), false);
                    assert.deepStrictEqual(i.next(), false);
                });
            }

            iterateTest(undefined);
            iterateTest(null);
            iterateTest([]);
            iterateTest(["a"]);
            iterateTest(["a", "b"]);
        });

        suite("iterateReverse()", () => {
            function iterateReverseTest(initialValues: string[]): void {
                test(`with ${JSON.stringify(initialValues)}`, () => {
                    const al = new qub.ArrayList<string>(initialValues);

                    const i = al.iterateReverse();
                    assert.deepStrictEqual(i.hasStarted(), false, "Wrong hasStarted() after creation.");
                    assert.deepStrictEqual(i.hasCurrent(), false, "Wrong hasCurrent() after creation.");

                    const initialValuesCount: number = qub.getLength(initialValues);
                    assert.deepStrictEqual(i.next(), initialValuesCount > 0, "Wrong first next().");

                    if (initialValues) {
                        for (let index: number = initialValuesCount - 1; index >= 0; --index) {
                            assert.deepStrictEqual(i.hasStarted(), true, `Wrong hasStarted() for index ${index}.`);
                            assert.deepStrictEqual(i.hasCurrent(), true, `Wrong hasCurrent() for index ${index}.`);
                            assert.deepStrictEqual(i.getCurrent(), initialValues[index]);
                            assert.deepStrictEqual(i.next(), index > 0);
                        }
                    }

                    assert.deepStrictEqual(i.hasStarted(), true);
                    assert.deepStrictEqual(i.hasCurrent(), false);
                    assert.deepStrictEqual(i.next(), false);
                });
            }

            iterateReverseTest(undefined);
            iterateReverseTest(null);
            iterateReverseTest([]);
            iterateReverseTest(["a"]);
            iterateReverseTest(["a", "b"]);
        });

        suite("foreach()", () => {
            function foreachTest(initialValues: number[]): void {
                test(`with ${JSON.stringify(initialValues)}`, () => {
                    const arrayList = initialValues ? new qub.ArrayList(initialValues) : new qub.ArrayList();

                    let expectedSum: number = 0;
                    if (initialValues) {
                        for (const element of initialValues) {
                            expectedSum += element;
                        }
                    }

                    let sum: number = 0;
                    arrayList.foreach(null);
                    arrayList.foreach((element: number) => { sum += element; });
                    assert.deepStrictEqual(sum, expectedSum);
                });
            }

            foreachTest(undefined);
            foreachTest([]);
            foreachTest([1]);
            foreachTest([38, 20]);
            foreachTest([1, 2, 3]);
        });

        suite("first()", () => {
            function firstTest(initialValues?: number[]): void {
                test(`with ${JSON.stringify(initialValues)}`, () => {
                    const arrayList = initialValues ? new qub.ArrayList(initialValues) : new qub.ArrayList();
                    assert.deepStrictEqual(arrayList.first(), initialValues && initialValues.length > 0 ? initialValues[0] : undefined);
                });
            }

            firstTest(undefined);
            firstTest([]);
            firstTest([30]);
            firstTest([31, 32]);
        });

        suite("last()", () => {
            function lastTest(initialValues?: number[]): void {
                test(`with ${JSON.stringify(initialValues)}`, () => {
                    const arrayList = initialValues ? new qub.ArrayList(initialValues) : new qub.ArrayList();
                    assert.deepStrictEqual(arrayList.last(), initialValues && initialValues.length > 0 ? initialValues[initialValues.length - 1] : undefined);
                });
            }

            lastTest(undefined);
            lastTest([]);
            lastTest([30]);
            lastTest([31, 32]);
        });

        test("set()", () => {
            const arrayList = new qub.ArrayList([0, 1, 2, 3, 4, 5]);
            arrayList.set(-1, 50);
            assert.deepStrictEqual(arrayList, new qub.ArrayList([0, 1, 2, 3, 4, 5]));

            arrayList.set(0, 17);
            assert.deepStrictEqual(arrayList, new qub.ArrayList([17, 1, 2, 3, 4, 5]));

            arrayList.set(3, 999);
            assert.deepStrictEqual(arrayList, new qub.ArrayList([17, 1, 2, 999, 4, 5]));

            arrayList.set(5, 1);
            assert.deepStrictEqual(arrayList, new qub.ArrayList([17, 1, 2, 999, 4, 1]));

            arrayList.set(6, 0);
            assert.deepStrictEqual(arrayList, new qub.ArrayList([17, 1, 2, 999, 4, 1]));

            arrayList.set(null, 10);
            assert.deepStrictEqual(arrayList, new qub.ArrayList([17, 1, 2, 999, 4, 1]));

            arrayList.set(undefined, 2);
            assert.deepStrictEqual(arrayList, new qub.ArrayList([17, 1, 2, 999, 4, 1]));

            arrayList.set(2, null);
            assert.deepStrictEqual(arrayList, new qub.ArrayList([17, 1, null, 999, 4, 1]));

            arrayList.set(0, undefined);
            assert.deepStrictEqual(arrayList, new qub.ArrayList([undefined, 1, null, 999, 4, 1]));
        });

        test("setLast()", () => {
            const al1 = new qub.ArrayList<string>();
            al1.setLast("hello!");
            assert.deepStrictEqual(al1, new qub.ArrayList<string>());

            const al2 = new qub.ArrayList(["hello", "there"]);
            al2.setLast("Abe");
            assert.deepStrictEqual(al2, new qub.ArrayList(["hello", "Abe"]));

            const al3 = new qub.ArrayList(["hello", "there"]);
            al3.setLast(null);
            assert.deepStrictEqual(al3, new qub.ArrayList(["hello", null]));

            const al4 = new qub.ArrayList(["hello", "there"]);
            al4.setLast(undefined);
            assert.deepStrictEqual(al4, new qub.ArrayList(["hello", undefined]));
        });

        suite("get()", () => {
            function getTest(values: string[]): void {
                const valuesLength: number = qub.getLength(values);

                for (let i = -1; i <= valuesLength + 1; ++i) {
                    test(`with ${JSON.stringify(values)} at index ${i}`, () => {
                        const al = new qub.ArrayList<string>(values);
                        assert.deepStrictEqual(al.get(i), (0 <= i && i < valuesLength) ? values[i] : undefined);
                    });
                }
            }

            getTest(undefined);
            getTest(null);
            getTest([]);
            getTest(["a"]);
            getTest(["a", "b"]);
        });

        suite("getLast()", () => {
            function getLastTest(values: string[]): void {
                const valuesLength: number = qub.getLength(values);

                for (let i = -1; i <= valuesLength + 1; ++i) {
                    test(`with ${JSON.stringify(values)} at index ${i}`, () => {
                        const al = new qub.ArrayList<string>(values);
                        assert.deepStrictEqual(al.getLast(i), (0 <= i && i < valuesLength) ? values[values.length - 1 - i] : undefined);
                    });
                }
            }

            getLastTest(undefined);
            getLastTest(null);
            getLastTest([]);
            getLastTest(["a"]);
            getLastTest(["a", "b"]);
        });

        suite("add()", () => {
            function addTest(initialValues: string[], valuesToAdd: string[]): void {
                test(`adding ${JSON.stringify(valuesToAdd)} to ${JSON.stringify(initialValues)}`, () => {
                    const al = new qub.ArrayList<string>(initialValues);
                    const initialValuesLength: number = qub.getLength(initialValues);

                    for (const valueToAdd of valuesToAdd) {
                        al.add(valueToAdd);

                        for (let i = 0; i < al.getCount(); ++i) {
                            if (i < initialValuesLength) {
                                assert.deepStrictEqual(al.get(i), initialValues[i]);
                            }
                            else {
                                assert.deepStrictEqual(al.get(i), valuesToAdd[i - initialValuesLength]);
                            }
                        }
                    }
                });
            }

            addTest([], ["a"]);
            addTest([], ["a", "b"]);
            addTest([], ["a", "b", "c"]);
            addTest(["a"], ["b"]);
            addTest(["a"], ["b", "c"]);
            addTest(["a", "b"], ["c"]);

            test(`adding ["c", "d"] to ["a", "b"] after removing "a"`, () => {
                const al = new qub.ArrayList<string>(["a", "b"]);
                al.remove("a");

                al.add("c");
                al.add("d");

                assert.deepStrictEqual(al.get(0), "b");
                assert.deepStrictEqual(al.get(1), "c");
                assert.deepStrictEqual(al.get(2), "d");
            });
        });

        suite("addAll()", () => {
            function addAllTest(initialValues: string[], valuesToAdd: string[]): void {
                test(`adding ${JSON.stringify(valuesToAdd)} to ${JSON.stringify(initialValues)}`, () => {
                    const al = new qub.ArrayList<string>(initialValues);
                    const initialValuesLength: number = qub.getLength(initialValues);

                    al.addAll(valuesToAdd);
                    for (let i = 0; i < al.getCount(); ++i) {
                        if (i < initialValuesLength) {
                            assert.deepStrictEqual(al.get(i), initialValues[i]);
                        }
                        else {
                            assert.deepStrictEqual(al.get(i), valuesToAdd[i - initialValuesLength]);
                        }
                    }
                });
            }

            addAllTest([], ["a"]);
            addAllTest([], ["a", "b"]);
            addAllTest([], ["a", "b", "c"]);
            addAllTest(["a"], ["b"]);
            addAllTest(["a"], ["b", "c"]);
            addAllTest(["a", "b"], ["c"]);
        });

        suite("indexOf()", () => {
            function indexOfTest(initialValues: string[], valueToSearchFor: string, expectedIndex: number, comparer?: (lhs: string, rhs: string) => boolean): void {
                test(`with ${JSON.stringify(initialValues)}, search for ${qub.quote(valueToSearchFor)}${comparer ? " using custom comparer" : ""}`, () => {
                    const al = new qub.ArrayList<string>(initialValues);
                    assert.deepStrictEqual(al.indexOf(valueToSearchFor, comparer), expectedIndex);
                });
            }

            indexOfTest(undefined, undefined, undefined);
            indexOfTest(undefined, null, undefined);
            indexOfTest(undefined, "", undefined);
            indexOfTest(undefined, "a", undefined);

            indexOfTest(null, undefined, undefined);
            indexOfTest(null, null, undefined);
            indexOfTest(null, "", undefined);
            indexOfTest(null, "a", undefined);

            indexOfTest([], undefined, undefined);
            indexOfTest([], null, undefined);
            indexOfTest([], "", undefined);
            indexOfTest([], "a", undefined);

            indexOfTest(["a"], undefined, undefined);
            indexOfTest(["a"], null, undefined);
            indexOfTest(["a"], "", undefined);
            indexOfTest(["a"], "a", 0);

            indexOfTest(["a", null], undefined, undefined);
            indexOfTest(["a", null], null, 1);
            indexOfTest(["a", null], "", undefined);
            indexOfTest(["a", null], "a", 0);

            indexOfTest(["a", null, ""], undefined, undefined);
            indexOfTest(["a", null, ""], null, 1);
            indexOfTest(["a", null, ""], "", 2);
            indexOfTest(["a", null, ""], "a", 0);

            indexOfTest(["a"], "a", 0, (lhs: string, rhs: string) => { return lhs.toLowerCase() === rhs.toLowerCase(); });
            indexOfTest(["a"], "A", 0, (lhs: string, rhs: string) => { return lhs.toLowerCase() === rhs.toLowerCase(); });
            indexOfTest(["a"], "b", undefined, (lhs: string, rhs: string) => { return lhs.toLowerCase() === rhs.toLowerCase(); });
        });

        suite("contains()", () => {
            function containsTest(initialValues: string[], valueToSearchFor: string, expected: boolean): void {
                test(`with ${JSON.stringify(initialValues)}, search for ${qub.quote(valueToSearchFor)}`, () => {
                    const al = new qub.ArrayList<string>(initialValues);
                    assert.deepStrictEqual(al.contains(valueToSearchFor), expected);
                });
            }

            containsTest(undefined, undefined, false);
            containsTest(undefined, null, false);
            containsTest(undefined, "", false);
            containsTest(undefined, "a", false);

            containsTest(null, undefined, false);
            containsTest(null, null, false);
            containsTest(null, "", false);
            containsTest(null, "a", false);

            containsTest([], undefined, false);
            containsTest([], null, false);
            containsTest([], "", false);
            containsTest([], "a", false);

            containsTest(["a"], undefined, false);
            containsTest(["a"], null, false);
            containsTest(["a"], "", false);
            containsTest(["a"], "a", true);

            containsTest(["a", null], undefined, false);
            containsTest(["a", null], null, true);
            containsTest(["a", null], "", false);
            containsTest(["a", null], "a", true);

            containsTest(["a", null, ""], undefined, false);
            containsTest(["a", null, ""], null, true);
            containsTest(["a", null, ""], "", true);
            containsTest(["a", null, ""], "a", true);
        });

        suite("removeAt()", () => {
            function removeAtTest(initialValues: string[], removeIndex: number): void {
                test(`with ${JSON.stringify(initialValues)} and ${removeIndex}`, () => {
                    const al = new qub.ArrayList<string>(initialValues);
                    const initialValuesLength: number = qub.getLength(initialValues);

                    al.removeAt(removeIndex);

                    if (removeIndex < 0 || initialValuesLength <= removeIndex) {
                        for (let i = 0; i < initialValuesLength; ++i) {
                            assert.deepStrictEqual(al.get(i), initialValues[i]);
                        }
                    }
                    else {
                        for (let i = 0; i < removeIndex; ++i) {
                            assert.deepStrictEqual(al.get(i), initialValues[i]);
                        }

                        for (let i = removeIndex; i <= al.getCount(); ++i) {
                            assert.deepStrictEqual(al.get(i), initialValues[i + 1]);
                        }
                    }
                });
            }

            for (let i = -1; i <= 1; ++i) {
                removeAtTest(undefined, i);
            }

            for (let i = -1; i <= 1; ++i) {
                removeAtTest(null, i);
            }

            for (let i = -1; i <= 1; ++i) {
                removeAtTest([], i);
            }

            for (let i = -1; i <= 2; ++i) {
                removeAtTest(["a"], i);
            }

            for (let i = -1; i <= 3; ++i) {
                removeAtTest(["a", "b"], i);
            }

            for (let i = -1; i <= 4; ++i) {
                removeAtTest(["a", "b", "c"], i);
            }
        });

        suite("remove()", () => {
            test(`removing "a" from []`, () => {
                const a = new qub.ArrayList<string>([]);
                a.remove("a");
                assert.deepStrictEqual(a.getCount(), 0);
            });

            test(`removing "a" from ["a"]`, () => {
                const a = new qub.ArrayList(["a"]);
                a.remove("a");
                assert.deepStrictEqual(a.getCount(), 0);
            });
        });

        test("removeFirst()", () => {
            const a = new qub.ArrayList<string>();
            assert.deepStrictEqual(a.removeFirst(), undefined);

            a.addAll(["a", "b"]);
            assert.deepStrictEqual(a.removeFirst(), "a");
            assert.deepStrictEqual(a.removeFirst(), "b");
            assert.deepStrictEqual(a.removeFirst(), undefined);
        });

        test("removeLast()", () => {
            const a = new qub.ArrayList<string>();
            assert.deepStrictEqual(a.removeLast(), undefined);

            a.addAll(["a", "b"]);
            assert.deepStrictEqual(a.removeLast(), "b");
            assert.deepStrictEqual(a.removeLast(), "a");
            assert.deepStrictEqual(a.removeLast(), undefined);
        });
    });

    suite("Stack", () => {
        test("constructor()", () => {
            const s = new qub.Stack<string>();
            assert.deepStrictEqual(s.getCount(), 0);
            assert.deepStrictEqual(s.any(), false);
            assert.deepStrictEqual(s.peek(), undefined);
        });

        test("push()", () => {
            const s = new qub.Stack<number>();
            s.push(10);
            assert.deepStrictEqual(s.getCount(), 1);
            assert.deepStrictEqual(s.peek(), 10);

            s.push(20);
            assert.deepStrictEqual(s.getCount(), 2);
            assert.deepStrictEqual(s.peek(), 20);
        });

        test("pop()", () => {
            const s = new qub.Stack<number>();
            assert.deepStrictEqual(s.pop(), undefined);
            assert.deepStrictEqual(s.getCount(), 0);

            s.push(50);
            s.push(60);
            assert.deepStrictEqual(s.getCount(), 2);
            assert.deepStrictEqual(s.peek(), 60);
            assert.deepStrictEqual(s.pop(), 60);
            assert.deepStrictEqual(s.getCount(), 1);
            assert.deepStrictEqual(s.pop(), 50);
            assert.deepStrictEqual(s.getCount(), 0);
            assert.deepStrictEqual(s.pop(), undefined);
            assert.deepStrictEqual(s.getCount(), 0);
        });

        test("contains()", () => {
            const s = new qub.Stack<number>();
            assert.deepStrictEqual(s.contains(0), false);

            s.push(20);
            s.push(16);
            assert.deepStrictEqual(s.contains(17), false);
            assert.deepStrictEqual(s.contains(16), true);
            assert.deepStrictEqual(s.contains(20), true);

            assert.deepStrictEqual(s.contains(5, (lhs: number, rhs: number) => lhs % 2 === rhs % 2), false);
            assert.deepStrictEqual(s.contains(4, (lhs: number, rhs: number) => lhs % 2 === rhs % 2), true);
        });
    });

    suite("Queue<T>", () => {
        test("constructor()", () => {
            const q = new qub.Queue<number>();
            assert.deepStrictEqual(q.getCount(), 0);
            assert.deepStrictEqual(q.any(), false);
            assert.deepStrictEqual(q.dequeue(), undefined);
        });

        test("enqueue()", () => {
            const q = new qub.Queue<number>();
            assert.deepStrictEqual(q.contains(0), false);

            q.enqueue(20);
            q.enqueue(16);
            assert.deepStrictEqual(q.contains(17), false);
            assert.deepStrictEqual(q.contains(16), true);
            assert.deepStrictEqual(q.contains(20), true);

            assert.deepStrictEqual(q.contains(5, (lhs: number, rhs: number) => lhs % 2 === rhs % 2), false);
            assert.deepStrictEqual(q.contains(4, (lhs: number, rhs: number) => lhs % 2 === rhs % 2), true);
        });

        test("dequeue()", () => {
            const q = new qub.Queue<number>();
            assert.deepStrictEqual(q.dequeue(), undefined);

            q.enqueue(0);
            q.enqueue(1);
            q.enqueue(2);

            assert.deepStrictEqual(q.getCount(), 3);
            assert.deepStrictEqual(q.any(), true);
            assert.deepStrictEqual(q.dequeue(), 0);
            assert.deepStrictEqual(q.dequeue(), 1);
            assert.deepStrictEqual(q.dequeue(), 2);
            assert.deepStrictEqual(q.dequeue(), undefined);
        });
    });

    suite("Iterable<T>", () => {
        suite("contains()", () => {
            function containsTest(testName: string, values: number[], searchFor: number, expected: boolean): void {
                test(testName, () => {
                    const ci = new qub.ArrayList(values);
                    assert.deepStrictEqual(ci.contains(searchFor), expected);
                });
            }

            containsTest("with undefined values", undefined, 7, false);
            containsTest("with null values", null, 7, false);
            containsTest("with no values", [], 7, false);
            containsTest("with searchFor value not in values", [1, 2, 3], 7, false);
            containsTest("with searchFor value in values", [1, 7, 3], 7, true);

            test("with searchFor value in in values with comparer", () => {
                const ci = new qub.ArrayList([1, 2, 3]);
                assert.deepStrictEqual(ci.contains(8, (lhs, rhs) => lhs % 2 === rhs % 2), true);
            });
        });

        suite("where()", () => {
            function whereTest(testName: string, originalValues: number[], condition: (value: number) => boolean, expectedValues: number[]): void {
                test(testName, () => {
                    const wi1: qub.Iterable<number> = new qub.ArrayList(originalValues).where(condition);
                    assert.deepStrictEqual(wi1.toArray(), expectedValues);
                });
            }

            whereTest("with undefined condition", [0, 1, 2], undefined, [0, 1, 2]);
            whereTest("return odd numbers", [0, 1, 2, 3, 4, 5], (value: number) => value % 2 === 1, [1, 3, 5]);
            whereTest("return numbers greater than 2", [0, 1, 2, 3, 4, 5], (value: number) => value > 2, [3, 4, 5]);

            const whereIterable = new qub.ArrayList([0, 1, 2, 3, 4, 5, 6]).where((value: number) => value % 2 == 0);

            test("iterateReverse()", () => {
                assert.deepStrictEqual(whereIterable.iterateReverse().toArray(), [6, 4, 2, 0]);
            });

            suite("any()", () => {
                function anyTest(testName: string, condition: (value: number) => boolean, expected: boolean): void {
                    test(testName, () => {
                        assert.deepStrictEqual(whereIterable.any(condition), expected);
                    });
                }

                anyTest("with no condition", undefined, true);
                anyTest("with condition with no matches", (value: number) => value > 10, false);
                anyTest("with condition with matches", (value: number) => value > 1, true);
            });

            suite("first()", () => {
                function firstTest(testName: string, condition: (value: number) => boolean, expected: number): void {
                    test(testName, () => {
                        assert.deepStrictEqual(whereIterable.first(condition), expected);
                    });
                }

                firstTest("with no condition", undefined, 0);
                firstTest("with condition with no matches", (value: number) => value > 10, undefined);
                firstTest("with condition with matches", (value: number) => value > 1, 2);
            });

            test("getCount()", () => {
                assert.deepStrictEqual(whereIterable.getCount(), 4);
            });

            suite("get()", () => {
                function getTest(index: number, expected: number): void {
                    test(`with ${index}`, () => {
                        assert.deepStrictEqual(whereIterable.get(index), expected);
                    });
                }

                getTest(-1, undefined);
                getTest(0, 0);
                getTest(1, 2);
                getTest(2, 4);
                getTest(3, 6);
                getTest(4, undefined);
            });

            suite("getLast()", () => {
                function getTest(index: number, expected: number): void {
                    test(`with ${index}`, () => {
                        assert.deepStrictEqual(whereIterable.getLast(index), expected);
                    });
                }

                getTest(-1, undefined);
                getTest(0, 6);
                getTest(1, 4);
                getTest(2, 2);
                getTest(3, 0);
                getTest(4, undefined);
            });

            test("foreach()", () => {
                let values: number[] = [];
                whereIterable.foreach((value: number) => values.push(value));
                assert.deepStrictEqual(values, [0, 2, 4, 6]);
            });

            suite("last()", () => {
                function lastTest(testName: string, condition: (value: number) => boolean, expected: number): void {
                    test(testName, () => {
                        assert.deepStrictEqual(whereIterable.last(condition), expected);
                    });
                }

                lastTest("with no condition", undefined, 6);
                lastTest("with condition with no matches", (value: number) => value > 10, undefined);
                lastTest("with condition with matches", (value: number) => value < 5, 4);
            });

            suite("where()", () => {
                function whereTest(testName: string, condition: (value: number) => boolean, expected: number[]): void {
                    test(testName, () => {
                        assert.deepStrictEqual(whereIterable.where(condition).toArray(), expected);
                    });
                }

                whereTest("with no condition", undefined, [0, 2, 4, 6]);
                whereTest("with condition with no matches", (value: number) => value > 10, []);
                whereTest("with condition with matches", (value: number) => value > 1, [2, 4, 6]);
            });

            suite("skip()", () => {
                function skipTest(toSkip: number, expected: number[]): void {
                    test(`with ${toSkip}`, () => {
                        assert.deepStrictEqual(whereIterable.skip(toSkip).toArray(), expected);
                    });
                }

                skipTest(undefined, [0, 2, 4, 6]);
                skipTest(0, [0, 2, 4, 6]);
                skipTest(1, [2, 4, 6]);
                skipTest(4, []);
                skipTest(10, []);
            });

            suite("take()", () => {
                function takeTest(toTake: number, expected: number[]): void {
                    test(`with ${toTake}`, () => {
                        assert.deepStrictEqual(whereIterable.take(toTake).toArray(), expected);
                    });
                }

                takeTest(undefined, []);
                takeTest(0, []);
                takeTest(1, [0]);
                takeTest(4, [0, 2, 4, 6]);
                takeTest(10, [0, 2, 4, 6]);
            });

            suite("map()", () => {
                function mapTest(testName: string, mapFunction: (value: number) => string, expected: string[]): void {
                    test(testName, () => {
                        assert.deepStrictEqual(whereIterable.map(mapFunction).toArray(), expected);
                    });
                }

                mapTest("with undefined mapFunction", undefined, []);
                mapTest("with toString() mapFunction", (value: number) => value.toString(), ["0", "2", "4", "6"]);
                mapTest("with *2 and toString() mapFunction", (value: number) => (value * 2).toString(), ["0", "4", "8", "12"]);
            });
        });

        suite("skip()", () => {
            function skipTest(testName: string, originalValues: number[], toSkip: number, expectedValues: number[]): void {
                test(testName, () => {
                    const si: qub.Iterable<number> = new qub.ArrayList(originalValues).skip(toSkip);
                    assert.deepStrictEqual(si.toArray(), expectedValues, "Wrong toArray() with unstarted skip iterator.");
                });
            }

            skipTest("with undefined toSkip", [0, 1, 2, 3, 4], undefined, [0, 1, 2, 3, 4]);
            skipTest("with 0 toSkip", [0, 1, 2, 3, 4], 0, [0, 1, 2, 3, 4]);
            skipTest("with 1 toSkip", [0, 1, 2, 3, 4], 1, [1, 2, 3, 4]);
            skipTest("with 4 toSkip", [0, 1, 2, 3, 4], 4, [4]);
            skipTest("with 5 toSkip", [0, 1, 2, 3, 4], 5, []);
            skipTest("with 200", [0, 1, 2, 3, 4], 200, []);

            const iterable = new qub.ArrayList([0, 1, 2, 3, 4]);
            test("iterateReverse()", () => {
                assert.deepStrictEqual(iterable.skip(2).iterateReverse().toArray(), [4, 3, 2]);
            });

            suite("getCount()", () => {
                function getCountTest(toSkip: number, expectedCount: number): void {
                    test(`with ${toSkip} toSkip`, () => {
                        assert.deepStrictEqual(iterable.skip(toSkip).getCount(), expectedCount);
                    });
                }

                getCountTest(undefined, 5);
                getCountTest(-1, 5);
                getCountTest(0, 5);
                getCountTest(1, 4);
                getCountTest(3, 2);
                getCountTest(5, 0);
                getCountTest(17, 0);
            });

            suite("get()", () => {
                function getTest(toSkip: number, index: number, expected: number): void {
                    test(`with ${toSkip} toSkip and index ${index}`, () => {
                        assert.deepStrictEqual(iterable.skip(toSkip).get(index), expected);
                    });
                }

                getTest(undefined, -1, undefined);
                getTest(undefined, 2, 2);
                getTest(3, 0, 3);
                getTest(3, 1, 4);
                getTest(4, 1, undefined);
            });

            suite("getLast()", () => {
                function getLastTest(toSkip: number, index: number, expected: number): void {
                    test(`with ${toSkip} toSkip and index ${index}`, () => {
                        assert.deepStrictEqual(iterable.skip(toSkip).getLast(index), expected);
                    });
                }

                getLastTest(undefined, -1, undefined);
                getLastTest(undefined, 2, 2);
                getLastTest(3, 0, 4);
                getLastTest(3, 1, 3);
                getLastTest(4, 1, undefined);
            });
        });

        suite("skipLast()", () => {
            function skipLastTest(testName: string, originalValues: number[], toSkip: number, expectedValues: number[]): void {
                test(testName, () => {
                    const si: qub.Iterable<number> = new qub.ArrayList(originalValues).skipLast(toSkip);
                    assert.deepStrictEqual(si.toArray(), expectedValues, "Wrong toArray() with unstarted skip iterator.");
                });
            }

            skipLastTest("with undefined toSkip", [0, 1, 2, 3, 4], undefined, [0, 1, 2, 3, 4]);
            skipLastTest("with 0 toSkip", [0, 1, 2, 3, 4], 0, [0, 1, 2, 3, 4]);
            skipLastTest("with 1 toSkip", [0, 1, 2, 3, 4], 1, [0, 1, 2, 3]);
            skipLastTest("with 4 toSkip", [0, 1, 2, 3, 4], 4, [0]);
            skipLastTest("with 5 toSkip", [0, 1, 2, 3, 4], 5, []);
            skipLastTest("with 200", [0, 1, 2, 3, 4], 200, []);

            const iterable = new qub.ArrayList([0, 1, 2, 3, 4]);
            test("iterateReverse()", () => {
                assert.deepStrictEqual(iterable.skipLast(2).iterateReverse().toArray(), [2, 1, 0]);
            });

            suite("getCount()", () => {
                function getCountTest(toSkip: number, expectedCount: number): void {
                    test(`with ${toSkip} toSkip`, () => {
                        assert.deepStrictEqual(iterable.skipLast(toSkip).getCount(), expectedCount);
                    });
                }

                getCountTest(undefined, 5);
                getCountTest(-1, 5);
                getCountTest(0, 5);
                getCountTest(1, 4);
                getCountTest(3, 2);
                getCountTest(5, 0);
                getCountTest(17, 0);
            });

            suite("get()", () => {
                function getTest(toSkip: number, index: number, expected: number): void {
                    test(`with ${toSkip} toSkip and index ${index}`, () => {
                        assert.deepStrictEqual(iterable.skipLast(toSkip).get(index), expected);
                    });
                }

                getTest(undefined, -1, undefined);
                getTest(undefined, 2, 2);
                getTest(3, 0, 0);
                getTest(3, 1, 1);
                getTest(4, 1, undefined);
            });
        });

        suite("take()", () => {
            function takeTest(testName: string, originalValues: number[], toTake: number, expectedValues: number[]): void {
                test(testName, () => {
                    const ti: qub.Iterable<number> = new qub.ArrayList(originalValues).take(toTake);
                    assert.deepStrictEqual(ti.toArray(), expectedValues, "Wrong toArray() with non-started take iterator.");
                });
            }

            takeTest("with undefined toTake", [0, 1, 2, 3, 4], undefined, []);
            takeTest("with 0 toTake", [0, 1, 2, 3, 4], 0, []);
            takeTest("with 1 toTake", [0, 1, 2, 3, 4], 1, [0]);
            takeTest("with 4 toTake", [0, 1, 2, 3, 4], 4, [0, 1, 2, 3]);
            takeTest("with 10 toTake", [0, 1, 2, 3, 4], 10, [0, 1, 2, 3, 4]);

            const iterable = new qub.ArrayList([0, 1, 2, 3, 4]);
            test("iterateReverse()", () => {
                assert.deepStrictEqual(iterable.take(2).iterateReverse().toArray(), [1, 0]);
            });

            suite("getCount()", () => {
                function getCountTest(toTake: number, expectedCount: number): void {
                    test(`with ${toTake} toTake`, () => {
                        assert.deepStrictEqual(iterable.take(toTake).getCount(), expectedCount);
                    });
                }

                getCountTest(undefined, 0);
                getCountTest(-1, 0);
                getCountTest(0, 0);
                getCountTest(1, 1);
                getCountTest(3, 3);
                getCountTest(5, 5);
                getCountTest(17, 5);
            });

            suite("get()", () => {
                function getTest(toTake: number, index: number, expected: number): void {
                    test(`with ${toTake} toTake and index ${index}`, () => {
                        assert.deepStrictEqual(iterable.take(toTake).get(index), expected);
                    });
                }

                getTest(undefined, -1, undefined);
                getTest(undefined, 2, undefined);
                getTest(2, 2, undefined);
                getTest(3, 0, 0);
                getTest(3, 1, 1);
                getTest(4, 1, 1);
            });
        });

        suite("takeLast()", () => {
            function takeLastTest(originalValues: number[], toTake: number, expectedValues: number[]): void {
                test(`with ${JSON.stringify(originalValues)} and ${toTake} toTake`, () => {
                    assert.deepStrictEqual(new qub.ArrayList(originalValues).takeLast(toTake).toArray(), expectedValues);
                });
            }

            takeLastTest([], -1, []);
            takeLastTest([0, 1, 2, 3], -1, []);
            takeLastTest([0, 1, 2, 3], 0, []);
            takeLastTest([0, 1, 2, 3], 1, [3]);
            takeLastTest([0, 1, 2, 3], 2, [2, 3]);
            takeLastTest([0, 1, 2, 3], 3, [1, 2, 3]);
            takeLastTest([0, 1, 2, 3], 4, [0, 1, 2, 3]);
            takeLastTest([0, 1, 2, 3], 5, [0, 1, 2, 3]);
        });

        suite("map()", () => {
            function mapTest(testName: string, originalValues: number[], mapFunction: (value: number) => string, expectedValues: string[]): void {
                test(testName, () => {
                    assert.deepStrictEqual(new qub.ArrayList(originalValues).map(mapFunction).toArray(), expectedValues, "Wrong toArray() with non-started map iterable.");
                });
            }

            mapTest("with undefined mapFunction", [0, 1, 2, 3, 4], undefined, []);
            mapTest("with toString() mapFunction", [0, 1, 2, 3, 4], (value: number) => value.toString(), ["0", "1", "2", "3", "4"]);
            mapTest("with *2 and toString() mapFunction", [0, 1, 2, 3, 4], (value: number) => (value * 2).toString(), ["0", "2", "4", "6", "8"]);

            const mapIterable = new qub.ArrayList([0, 1, 2, 3]).map((value: number) => value.toString());;
            test("iterateReverse()", () => {
                assert.deepStrictEqual(mapIterable.iterateReverse().toArray(), ["3", "2", "1", "0"]);
            });

            test("any()", () => {
                assert.deepStrictEqual(mapIterable.any(), true);
                assert.deepStrictEqual(mapIterable.any((value: string) => value === "1"), true);
                assert.deepStrictEqual(mapIterable.any((value: string) => value === "-1"), false);
            });

            test("getCount()", () => {
                assert.deepStrictEqual(mapIterable.getCount(), 4);
            });

            test("get()", () => {
                assert.deepStrictEqual(mapIterable.get(-1), undefined);
                assert.deepStrictEqual(mapIterable.get(0), "0");
                assert.deepStrictEqual(mapIterable.get(3), "3");
                assert.deepStrictEqual(mapIterable.get(4), undefined);
            });

            suite("getLast()", () => {
                function getLastTest(index: number, expected: string): void {
                    test(`with index ${index}`, () => {
                        assert.deepStrictEqual(mapIterable.getLast(index), expected);
                    });
                }

                getLastTest(-1, undefined);
                getLastTest(0, "3");
                getLastTest(1, "2");
                getLastTest(2, "1");
                getLastTest(3, "0");
                getLastTest(4, undefined);
            });

            suite("contains()", () => {
                function containsTest(testName: string, values: number[], searchFor: string, expected: boolean): void {
                    test(testName, () => {
                        const mi = new qub.ArrayList(values).map((value) => value.toString());
                        assert.deepStrictEqual(mi.contains(searchFor), expected);
                    });
                }

                containsTest("with undefined values", undefined, "7", false);
                containsTest("with null values", null, "7", false);
                containsTest("with no values", [], "7", false);
                containsTest("with searchFor value not in values", [1, 2, 3], "7", false);
                containsTest("with searchFor value in values", [1, 7, 3], "7", true);

                test("with searchFor value in in values with comparer", () => {
                    const ci = new qub.ArrayList([1, 2, 3]).map((value) => value.toString());
                    assert.deepStrictEqual(ci.contains("200", (iterableValue, value) => value.substring(0, 1) === iterableValue), true);
                });
            });

            test("foreach()", () => {
                let aggregate: string = "";
                mapIterable.foreach((value: string) => aggregate += value);
                assert.deepStrictEqual(aggregate, "0123");
            });

            test("first()", () => {
                assert.deepStrictEqual(mapIterable.first(), "0");
            });

            test("last()", () => {
                assert.deepStrictEqual(mapIterable.last(), "3");
            });

            test("where()", () => {
                assert.deepStrictEqual(mapIterable.where(undefined).toArray(), mapIterable.toArray());
                assert.deepStrictEqual(mapIterable.where((value: string) => value === "2").toArray(), ["2"]);
            });

            test("skip()", () => {
                assert.deepStrictEqual(mapIterable.skip(undefined).toArray(), mapIterable.toArray());
                assert.deepStrictEqual(mapIterable.skip(-1).toArray(), mapIterable.toArray());
                assert.deepStrictEqual(mapIterable.skip(2).toArray(), ["2", "3"]);
                assert.deepStrictEqual(mapIterable.skip(10).toArray(), []);
            });

            test("skipLast()", () => {
                assert.deepStrictEqual(mapIterable.skipLast(undefined).toArray(), mapIterable.toArray());
                assert.deepStrictEqual(mapIterable.skipLast(-1).toArray(), mapIterable.toArray());
                assert.deepStrictEqual(mapIterable.skipLast(2).toArray(), ["0", "1"]);
                assert.deepStrictEqual(mapIterable.skipLast(10).toArray(), []);
            });

            test("take()", () => {
                assert.deepStrictEqual(mapIterable.take(undefined).toArray(), [], "Wrong result when undefined taken.");
                assert.deepStrictEqual(mapIterable.take(-1).toArray(), [], "Wrong result when -1 taken.");
                assert.deepStrictEqual(mapIterable.take(3).toArray(), ["0", "1", "2"], "Wrong result when 3 taken.");
                assert.deepStrictEqual(mapIterable.take(200).toArray(), mapIterable.toArray(), "Wrong result when 200 taken.");
            });

            test("takeLast()", () => {
                assert.deepStrictEqual(mapIterable.takeLast(undefined).toArray(), [], "Wrong result when last undefined taken.");
                assert.deepStrictEqual(mapIterable.takeLast(-1).toArray(), [], "Wrong result when last -1 taken.");
                assert.deepStrictEqual(mapIterable.takeLast(3).toArray(), ["1", "2", "3"], "Wrong result when last 3 taken.");
                assert.deepStrictEqual(mapIterable.takeLast(200).toArray(), mapIterable.toArray(), "Wrong result when last 200 taken.");
            });

            test("map()", () => {
                assert.deepStrictEqual(mapIterable.map(undefined).toArray(), []);
                assert.deepStrictEqual(mapIterable.map((value: string) => value + value).toArray(), ["00", "11", "22", "33"]);
            });

            test("concatenate()", () => {
                assert.deepStrictEqual(mapIterable.concatenate(undefined).toArray(), ["0", "1", "2", "3"]);
                assert.deepStrictEqual(mapIterable.concatenate(null).toArray(), ["0", "1", "2", "3"]);
                assert.deepStrictEqual(mapIterable.concatenate([]).toArray(), ["0", "1", "2", "3"]);
                assert.deepStrictEqual(mapIterable.concatenate(["4", "5"]).toArray(), ["0", "1", "2", "3", "4", "5"]);
            });

            suite("endsWith()", () => {
                function endsWithTest(values: number[], endingValues: string[], expected: boolean): void {
                    test(`with ${JSON.stringify(values)} and ${JSON.stringify(endingValues)}`, () => {
                        const mapValues: qub.Iterable<string> = new qub.ArrayList(values).map((value: number) => value.toString());
                        const mapEndingValues: qub.Iterable<string> = endingValues ? new qub.ArrayList(endingValues) : undefined;
                        assert.deepStrictEqual(mapValues.endsWith(mapEndingValues), expected);
                    });
                }

                endsWithTest([], undefined, false);
                endsWithTest([1], undefined, false);
                endsWithTest([], [], false);
                endsWithTest([], ["1"], false);
                endsWithTest([1], [], false);
                endsWithTest([1], ["1"], true);
                endsWithTest([1], ["1", "2"], false);
                endsWithTest([1, 2, 3], ["3"], true);
                endsWithTest([1, 2, 3], ["2", "3"], true);
                endsWithTest([1, 2, 3], ["4", "3"], false);
                endsWithTest([1, 2, 3], ["2", "4"], false);
            });
        });

        suite("concatenate()", () => {
            function concatenateTest(originalValues: number[], toConcatenate: number[], expectedValues: number[]): void {
                test(`with ${JSON.stringify(originalValues)} and ${JSON.stringify(toConcatenate)}`, () => {
                    assert.deepStrictEqual(new qub.ArrayList(originalValues).concatenate(new qub.ArrayList(toConcatenate)).toArray(), expectedValues);
                });
            }

            concatenateTest([], [], []);
            concatenateTest([0, 1, 2, 3], [], [0, 1, 2, 3]);
            concatenateTest([0, 1, 2, 3], [4], [0, 1, 2, 3, 4]);
            concatenateTest([0, 1, 2, 3], [4, 5], [0, 1, 2, 3, 4, 5]);
            concatenateTest([0, 1, 2, 3], [4, 5, 6], [0, 1, 2, 3, 4, 5, 6]);
            concatenateTest([], [0, 1, 2, 3], [0, 1, 2, 3]);

            test("iterateReverse()", () => {
                assert.deepStrictEqual(new qub.ArrayList<number>([0, 1, 2]).concatenate([3, 4]).iterateReverse().toArray(), [4, 3, 2, 1, 0]);
            });
        });

        suite("endsWith()", () => {
            function endsWithTest(values: number[], endingValues: number[], expected: boolean): void {
                test(`with ${JSON.stringify(values)} and ${JSON.stringify(endingValues)}`, () => {
                    assert.deepStrictEqual(new qub.ArrayList(values).endsWith(new qub.ArrayList(endingValues)), expected);
                });
            }

            test(`with [] and undefined`, () => {
                assert.deepStrictEqual(new qub.ArrayList([]).endsWith(undefined), false);
            });

            test(`with [1] and undefined`, () => {
                assert.deepStrictEqual(new qub.ArrayList([1]).endsWith(undefined), false);
            });

            endsWithTest([], [], false);
            endsWithTest([], [1], false);
            endsWithTest([1], [], false);
            endsWithTest([1], [1], true);
            endsWithTest([1], [1, 2], false);
            endsWithTest([1, 2, 3], [3], true);
            endsWithTest([1, 2, 3], [2, 3], true);
            endsWithTest([1, 2, 3], [4, 3], false);
            endsWithTest([1, 2, 3], [2, 4], false);
        });
    });

    suite("Iterator<T>", () => {
        suite("any()", () => {
            function anyTest(testName: string, originalValues: number[], condition: (value: number) => boolean, expected: boolean): void {
                test(testName, () => {
                    const iterable = new qub.ArrayList(originalValues);
                    assert.deepStrictEqual(iterable.iterate().any(condition), expected);

                    const iterator: qub.Iterator<number> = iterable.iterate();
                    iterator.next();
                    assert.deepStrictEqual(iterator.any(condition), expected);
                });
            }

            anyTest("empty iterator with undefined condition", [], undefined, false);
            anyTest("empty iterator with condition", [], (value: number) => value % 2 == 0, false);
            anyTest("non-empty iterator with undefined condition", [1, 3, 5], undefined, true);
            anyTest("non-empty iterator with condition with no matches", [1, 3, 5], (value: number) => value % 2 == 0, false);
            anyTest("non-empty iterator with condition with matches", [1, 3, 5, 4], (value: number) => value % 2 == 0, true);
        });

        suite("first()", () => {
            function firstTest(testName: string, originalValues: number[], condition: (value: number) => boolean, expected: number): void {
                test(testName, () => {
                    const iterable = new qub.ArrayList(originalValues);
                    assert.deepStrictEqual(iterable.iterate().first(condition), expected);

                    const iterator: qub.Iterator<number> = iterable.iterate();
                    iterator.next();
                    assert.deepStrictEqual(iterator.first(condition), expected);
                });
            }

            firstTest("empty iterator with undefined condition", [], undefined, undefined);
            firstTest("empty iterator with condition", [], (value: number) => value % 2 == 0, undefined);
            firstTest("non-empty iterator with undefined condition", [1, 3, 5], undefined, 1);
            firstTest("non-empty iterator with condition with no matches", [1, 3, 5], (value: number) => value % 2 == 0, undefined);
            firstTest("non-empty iterator with condition with matches", [1, 3, 5, 4], (value: number) => value % 2 == 0, 4);
        });

        suite("getCount()", () => {
            function getCountTest(values: string[]): void {
                const valuesLength: number = qub.getLength(values);

                const arrayList = values ? new qub.ArrayList<string>(values) : new qub.ArrayList<string>();
                const i1: qub.Iterator<string> = arrayList.iterate();
                assert.deepStrictEqual(valuesLength, i1.getCount());

                const i2: qub.Iterator<string> = arrayList.iterate();
                i2.next();
                assert.deepStrictEqual(valuesLength, i2.getCount());

                const i3: qub.Iterator<string> = arrayList.iterate();
                for (let i = 0; i < 2; ++i) {
                    i3.next();
                }
                assert.deepStrictEqual(valuesLength > 0 ? valuesLength - 1 : valuesLength, i3.getCount());
            }

            getCountTest(undefined);
            getCountTest([]);
            getCountTest(["a"]);
            getCountTest(["a", "b"]);
        });

        suite("foreach()", () => {
            function foreachTest(values: string[]): void {
                const arrayList = values ? new qub.ArrayList<string>(values) : new qub.ArrayList<string>();
                const i1: qub.Iterator<string> = arrayList.iterate();

                i1.foreach(null);

                let joinedString1: string = "";
                i1.foreach((value: string) => { joinedString1 += value; });
                assert.deepStrictEqual(joinedString1, qub.getCombinedText(values));

                const i2: qub.Iterator<string> = arrayList.iterate();
                i2.next();

                let joinedString2: string = "";
                i2.foreach((value: string) => { joinedString2 += value; });
                assert.deepStrictEqual(joinedString2, qub.getCombinedText(values));
            }

            foreachTest(undefined);
            foreachTest([]);
            foreachTest(["a"]);
            foreachTest(["a", "b"]);

            test(`with ["a", "b", "c"] and stop()`, () => {
                const arrayList = new qub.ArrayList(["a", "b", "c"]);
                const iterator: qub.Iterator<string> = arrayList.iterate();

                let joinedString: string = "";
                iterator.foreach((value: string, control: qub.Control) => {
                    joinedString += value;
                    if (value === "b") {
                        control.break();
                    }
                });

                assert.deepStrictEqual(joinedString, "ab");
                assert.deepStrictEqual(iterator.hasStarted(), true);
                assert.deepStrictEqual(iterator.hasCurrent(), true);
                assert.deepStrictEqual(iterator.getCurrent(), "b");
            });
        });

        suite("where()", () => {
            function whereTest(testName: string, originalValues: number[], condition: (value: number) => boolean, expectedValues: number[]): void {
                test(testName, () => {
                    const wi1: qub.Iterator<number> = new qub.ArrayList(originalValues).iterate().where(condition);
                    assert.deepStrictEqual(wi1.hasStarted(), false, "Wrong hasStarted().");
                    assert.deepStrictEqual(wi1.toArray(), expectedValues);

                    const i2: qub.Iterator<number> = new qub.ArrayList(originalValues).iterate();
                    i2.next();
                    const wi2: qub.Iterator<number> = i2.where(condition);
                    assert.deepStrictEqual(wi2.hasStarted(), true, "Wrong hasStarted() with started iterator.");
                    assert.deepStrictEqual(wi2.toArray(), expectedValues, "Wrong toArray() with started iterator.");
                });
            }

            whereTest("with undefined condition", [0, 1, 2], undefined, [0, 1, 2]);
            whereTest("return odd numbers", [0, 1, 2, 3, 4, 5], (value: number) => value % 2 === 1, [1, 3, 5]);
            whereTest("return numbers greater than 2", [0, 1, 2, 3, 4, 5], (value: number) => value > 2, [3, 4, 5]);
        });

        suite("skip()", () => {
            function skipTest(testName: string, originalValues: number[], toSkip: number, expectedValues: number[]): void {
                test(testName, () => {
                    const iterable = new qub.ArrayList(originalValues);

                    const si1: qub.Iterator<number> = iterable.iterate().skip(toSkip);
                    assert.deepStrictEqual(si1.hasStarted(), false, "Wrong hasStarted() with non-started skip iterator.");
                    assert.deepStrictEqual(si1.hasCurrent(), false, "Wrong hasCurrent() with non-started skip iterator.");
                    assert.deepStrictEqual(si1.getCurrent(), undefined, "Wrong getCurrent() with non-started skip iterator.");
                    assert.deepStrictEqual(si1.toArray(), expectedValues, "Wrong toArray() with unstarted skip iterator.");

                    const i2: qub.Iterator<number> = iterable.iterate();
                    i2.next();
                    const si2: qub.Iterator<number> = i2.skip(toSkip);
                    assert.deepStrictEqual(si2.hasStarted(), true, "Wrong hasStarted() with started skip iterator.");
                    assert.deepStrictEqual(si2.hasCurrent(), !qub.isDefined(toSkip) || toSkip < originalValues.length, "Wrong hasCurrent() with started skip iterator.");
                    assert.deepStrictEqual(si2.toArray(), expectedValues);

                    const i3: qub.Iterator<number> = iterable.iterate();
                    i3.next();
                    const si3: qub.Iterator<number> = i3.skip(toSkip);
                    assert.deepStrictEqual(si3.getCurrent(), !qub.isDefined(toSkip) || toSkip < originalValues.length ? originalValues[toSkip || 0] : undefined, "Wrong getCurrent() with started skip iterator.");
                });
            }

            skipTest("with undefined toSkip", [0, 1, 2, 3, 4], undefined, [0, 1, 2, 3, 4]);
            skipTest("with 0 toSkip", [0, 1, 2, 3, 4], 0, [0, 1, 2, 3, 4]);
            skipTest("with 1 toSkip", [0, 1, 2, 3, 4], 1, [1, 2, 3, 4]);
            skipTest("with 4 toSkip", [0, 1, 2, 3, 4], 4, [4]);
            skipTest("with 5 toSkip", [0, 1, 2, 3, 4], 5, []);
            skipTest("with 200", [0, 1, 2, 3, 4], 200, []);
        });

        suite("take()", () => {
            function takeTest(testName: string, originalValues: number[], toTake: number, expectedValues: number[]): void {
                test(testName, () => {
                    const iterable = new qub.ArrayList(originalValues);

                    const ti1: qub.Iterator<number> = iterable.iterate().take(toTake);
                    assert.deepStrictEqual(ti1.hasStarted(), false, "Wrong hasStarted() with non-started take iterator.");
                    assert.deepStrictEqual(ti1.hasCurrent(), false, "Wrong hasCurrent() with non-started take iterator.");
                    assert.deepStrictEqual(ti1.getCurrent(), undefined, "Wrong getCurrent() with non-started take iterator.");
                    assert.deepStrictEqual(ti1.toArray(), expectedValues, "Wrong toArray() with non-started take iterator.");

                    const i2: qub.Iterator<number> = iterable.iterate();
                    i2.next();
                    const ti2: qub.Iterator<number> = i2.take(toTake);
                    assert.deepStrictEqual(ti2.hasStarted(), true, "Wrong hasStarted() with started take iterator.");
                    assert.deepStrictEqual(ti2.hasCurrent(), qub.isDefined(toTake) && 1 <= toTake, "Wrong hasCurrent() with started take iterator.");
                    assert.deepStrictEqual(ti2.toArray(), expectedValues, "Wrong toArray() with started take iterator.");
                });
            }

            takeTest("with undefined toTake", [0, 1, 2, 3, 4], undefined, []);
            takeTest("with 0 toTake", [0, 1, 2, 3, 4], 0, []);
            takeTest("with 1 toTake", [0, 1, 2, 3, 4], 1, [0]);
            takeTest("with 4 toTake", [0, 1, 2, 3, 4], 4, [0, 1, 2, 3]);
            takeTest("with 10 toTake", [0, 1, 2, 3, 4], 10, [0, 1, 2, 3, 4]);
        });

        suite("map()", () => {
            function mapTest(testName: string, originalValues: number[], mapFunction: (value: number) => string, expectedValues: string[]): void {
                test(testName, () => {
                    const iterable = new qub.ArrayList(originalValues);

                    const mi1: qub.Iterator<string> = iterable.iterate().map(mapFunction);
                    assert.deepStrictEqual(mi1.hasStarted(), false, "Wrong hasStarted() with non-started map iterator.");
                    assert.deepStrictEqual(mi1.hasCurrent(), false, "Wrong hasCurrent() with non-started map iterator.");
                    assert.deepStrictEqual(mi1.getCurrent(), undefined, "Wrong getCurrent() with non-started map iterator.");
                    assert.deepStrictEqual(mi1.toArray(), expectedValues, "Wrong toArray() with non-started map iterator.");

                    const i2: qub.Iterator<number> = iterable.iterate();
                    i2.next();
                    const mi2: qub.Iterator<string> = i2.map(mapFunction);
                    assert.deepStrictEqual(mi2.hasStarted(), true, "Wrong hasStarted() with started map iterator.");
                    assert.deepStrictEqual(mi2.hasCurrent(), qub.isDefined(mapFunction), "Wrong hasCurrent() with started map iterator.");
                    assert.deepStrictEqual(mi2.getCurrent(), expectedValues[0], "Wrong getCurrent() with started map iterator.");
                    assert.deepStrictEqual(mi2.toArray(), expectedValues, "Wrong toArray() with started map iterator.");

                    const mi3: qub.Iterator<string> = iterable.iterate().map(mapFunction);
                    assert.deepStrictEqual(mi3.next(), qub.isDefined(mapFunction), "Wrong next() with non-started map iterator.");

                    const mi4: qub.Iterator<string> = iterable.iterate().map(mapFunction);
                    assert.deepStrictEqual(mi4.getCount(), expectedValues.length, "Wrong getCount() with non-started map iterator.");

                    const mi5: qub.Iterator<string> = iterable.iterate().map(mapFunction);
                    assert.deepStrictEqual(mi5.toArrayList(), new qub.ArrayList(expectedValues));
                });
            }

            mapTest("with undefined mapFunction", [0, 1, 2, 3, 4], undefined, []);
            mapTest("with toString() mapFunction", [0, 1, 2, 3, 4], (value: number) => value.toString(), ["0", "1", "2", "3", "4"]);
            mapTest("with *2 and toString() mapFunction", [0, 1, 2, 3, 4], (value: number) => (value * 2).toString(), ["0", "2", "4", "6", "8"]);

            const iterable = new qub.ArrayList([0, 1, 2, 3]);
            suite("any()", () => {
                test("with no condition", () => {
                    assert.deepStrictEqual(iterable.iterate().map((value: number) => value.toString()).any(), true);
                });

                test("with matching condition", () => {
                    assert.deepStrictEqual(iterable.iterate().map((value: number) => value.toString()).any((value: string) => value === "2"), true);
                });

                test("with non-matching condition", () => {
                    assert.deepStrictEqual(iterable.iterate().map((value: number) => value.toString()).any((value: string) => value === "-2"), false);
                });
            });

            suite("first()", () => {
                test("with no condition", () => {
                    assert.deepStrictEqual(iterable.iterate().map((value: number) => value.toString()).first(), "0");
                });

                test("with condition", () => {
                    assert.deepStrictEqual(iterable.iterate().map((value: number) => value.toString()).first((value: string) => value === "2"), "2");
                });
            });

            test("where()", () => {
                assert.deepStrictEqual(iterable.iterate().map((value: number) => value.toString()).where((value: string) => value === "2").toArray(), ["2"]);
            });

            test("skip()", () => {
                assert.deepStrictEqual(iterable.iterate().map((value: number) => value.toString()).skip(2).toArray(), ["2", "3"]);
            });

            test("take()", () => {
                assert.deepStrictEqual(iterable.iterate().map((value: number) => value.toString()).take(3).toArray(), ["0", "1", "2"]);
            });

            test("map()", () => {
                assert.deepStrictEqual(iterable.iterate().map((value: number) => value.toString()).map((value: string) => value + value).toArray(), ["00", "11", "22", "33"]);
            });
        });

        suite("concatenate()", () => {
            function concatenateTest(testName: string, originalValues: number[], toAdd: number[], expectedValues: number[]): void {
                test(testName, () => {
                    const iterable = new qub.ArrayList(originalValues);

                    const ci1: qub.Iterator<number> = iterable.iterate().concatenate(toAdd);
                    assert.deepStrictEqual(ci1.hasStarted(), false, "Wrong hasStarted() with non-started skip iterator.");
                    assert.deepStrictEqual(ci1.hasCurrent(), false, "Wrong hasCurrent() with non-started skip iterator.");
                    assert.deepStrictEqual(ci1.getCurrent(), undefined, "Wrong getCurrent() with non-started skip iterator.");
                    assert.deepStrictEqual(ci1.toArray(), expectedValues, "Wrong toArray() with unstarted skip iterator.");

                    const i2: qub.Iterator<number> = iterable.iterate();
                    i2.next();
                    const ci2: qub.Iterator<number> = i2.concatenate(toAdd);
                    assert.deepStrictEqual(ci2.hasStarted(), true, "Wrong hasStarted() with started concatenate iterator.");
                    assert.deepStrictEqual(ci2.hasCurrent(), qub.getLength(originalValues) >= 1 || qub.getLength(toAdd) >= 1, "Wrong hasCurrent() with started concatenate iterator.");
                    assert.deepStrictEqual(ci2.toArray(), expectedValues);

                    const ci3: qub.Iterator<number> = iterable.iterate().concatenate(toAdd);
                    ci3.next();
                    assert.deepStrictEqual(ci3.getCurrent(), qub.getLength(originalValues) >= 1 ? originalValues[0] : qub.getLength(toAdd) >= 1 ? toAdd[0] : undefined, "Wrong getCurrent() with started skip iterator.");
                });
            }

            concatenateTest("with undefined toAdd", [0, 1, 2, 3, 4], undefined, [0, 1, 2, 3, 4]);
            concatenateTest("with null toAdd", [0, 1, 2, 3, 4], null, [0, 1, 2, 3, 4]);
            concatenateTest("with [] toAdd", [0, 1, 2, 3, 4], [], [0, 1, 2, 3, 4]);
            concatenateTest("with [0] toAdd", [0, 1, 2, 3, 4], [0], [0, 1, 2, 3, 4, 0]);
            concatenateTest("with [1,2] toAdd", [0, 1, 2, 3, 4], [1, 2], [0, 1, 2, 3, 4, 1, 2]);
            concatenateTest("with [4,5,6] toAdd", [0, 1, 2, 3, 4], [4, 5, 6], [0, 1, 2, 3, 4, 4, 5, 6]);
        });
    });

    suite("Map", () => {
        test("constructor()", () => {
            const map = new qub.Map<string, number>();
            assert.deepStrictEqual(map.getCount(), 0);
        });

        test("add()", () => {
            const map = new qub.Map<string, number>();
            assert.deepStrictEqual(map.contains("hello"), false);

            map.add("hello", 5);
            assert.deepStrictEqual(map.get("hello"), 5);
            assert.deepStrictEqual(map.contains("hello"), true);

            map.add("hello", 6);
            assert.deepStrictEqual(map.get("hello"), 6);
            assert.deepStrictEqual(map.contains("hello"), true);
        });

        test("addAll()", () => {
            const map = new qub.Map<string, number>();
            map.addAll(undefined);
            assert.deepStrictEqual(map.getCount(), 0);

            map.addAll(null);
            assert.deepStrictEqual(map.getCount(), 0);

            map.addAll([]);
            assert.deepStrictEqual(map.getCount(), 0);

            map.addAll([{ key: "one", value: 1 }, { key: "two", value: 2 }]);
            assert.deepStrictEqual(map.getCount(), 2);
            assert.deepStrictEqual(map.get("one"), 1);
            assert.deepStrictEqual(map.get("two"), 2);

            map.addAll(new qub.ArrayList<qub.KeyValuePair<string, number>>([{ key: "three", value: 3 }]));
            assert.deepStrictEqual(map.getCount(), 3);
            assert.deepStrictEqual(map.get("one"), 1);
            assert.deepStrictEqual(map.get("two"), 2);
            assert.deepStrictEqual(map.get("three"), 3);
        });
    });

    suite("Span", () => {
        suite("constructor(number,number)", () => {
            function constructorTest(startIndex: number, length: number): void {
                test(`with ${startIndex} and ${length}`, () => {
                    const span = new qub.Span(startIndex, length);
                    assert.deepStrictEqual(span.startIndex, startIndex);
                    assert.deepStrictEqual(span.length, length);
                    assert.deepStrictEqual(span.afterEndIndex, startIndex + length);
                    assert.deepStrictEqual(span.endIndex, startIndex + length - 1);
                    assert.deepStrictEqual(span.toString(), `[${startIndex},${startIndex + length})`);
                });
            }

            constructorTest(0, 0);
            constructorTest(0, 1);
            constructorTest(0, 2);
            constructorTest(3, 2);
        });
    });

    suite("Token", () => {
        suite("constructor(TokenType,number)", () => {
            test("with LeftCurlyBracket and 0", () => {
                const t = new qub.Lex("{", 0, qub.LexType.LeftCurlyBracket);
                assert.deepStrictEqual(t.getType(), qub.LexType.LeftCurlyBracket);
                assert.deepStrictEqual(t.startIndex, 0);
                assert.deepStrictEqual(t.afterEndIndex, 1);
                assert.deepStrictEqual(t.span, new qub.Span(0, 1));
                assert.deepStrictEqual(t.toString(), "{");
            });

            test("with RightCurlyBracket and 17", () => {
                const t = new qub.Lex("}", 17, qub.LexType.RightCurlyBracket);
                assert.deepStrictEqual(t.getType(), qub.LexType.RightCurlyBracket);
                assert.deepStrictEqual(t.startIndex, 17);
                assert.deepStrictEqual(t.afterEndIndex, 18);
                assert.deepStrictEqual(t.span, new qub.Span(17, 1));
                assert.deepStrictEqual(t.toString(), "}");
            });
        });
    });

    suite("Tokenizer", () => {
        suite("constructor(string,number)", () => {
            function constructorTest(text: string): void {
                test(`with ${qub.escapeAndQuote(text)}`, () => {
                    const tokenizer = new qub.Lexer(text);
                    assert.deepStrictEqual(tokenizer.hasStarted(), false);
                });
            }

            constructorTest(null);
            constructorTest(undefined);
            constructorTest("");
            constructorTest("{}");
            constructorTest("{}");
        });

        suite("next()", () => {
            function nextTest(text: string, expectedTokens: qub.Lex[]): void {
                test(`with ${qub.quote(qub.escape(text))}`, () => {
                    const tokenizer = new qub.Lexer(text);

                    for (const expectedToken of expectedTokens) {
                        assert.deepStrictEqual(tokenizer.next(), true, "Wrong next()");
                        assert.deepStrictEqual(tokenizer.hasStarted(), true, "Wrong hasStarted()");
                        assert.deepStrictEqual(tokenizer.getCurrent(), expectedToken, "Wrong getCurrent()");
                    }

                    for (let i: number = 0; i < 2; ++i) {
                        assert.deepStrictEqual(tokenizer.next(), false);
                        assert.deepStrictEqual(tokenizer.hasStarted(), true);
                        assert.deepStrictEqual(tokenizer.getCurrent(), undefined);
                    }
                });
            }

            nextTest(null, []);
            nextTest(undefined, []);
            nextTest("", []);
            nextTest("{", [qub.LeftCurlyBracket(0)]);
            nextTest("}", [qub.RightCurlyBracket(0)]);
            nextTest("[", [qub.LeftSquareBracket(0)]);
            nextTest("]", [qub.RightSquareBracket(0)]);
            nextTest("<", [qub.LeftAngleBracket(0)]);
            nextTest(">", [qub.RightAngleBracket(0)]);
            nextTest(" ", [qub.Space(0)]);
            nextTest("  ", [qub.Space(0), qub.Space(1)]);
            nextTest("\t", [qub.Tab(0)]);
            nextTest("\r", [qub.CarriageReturn(0)]);
            nextTest("\n", [qub.NewLine(0)]);
            nextTest("\r\n", [qub.CarriageReturnNewLine(0)]);
            nextTest("\ra", [qub.CarriageReturn(0), qub.Letters("a", 1)]);
            nextTest("abc", [qub.Letters("abc", 0)]);
            nextTest("null", [qub.Letters("null", 0)]);
            nextTest(`"`, [qub.DoubleQuote(0)]);
            nextTest("'", [qub.SingleQuote(0)]);
            nextTest("789", [qub.Digits("789", 0)]);
            nextTest("3.6",
                [
                    qub.Digits("3", 0),
                    qub.Period(1),
                    qub.Digits("6", 2)
                ]);
            nextTest("1.2.3",
                [
                    qub.Digits("1", 0),
                    qub.Period(1),
                    qub.Digits("2", 2),
                    qub.Period(3),
                    qub.Digits("3", 4)
                ]);
            nextTest("-5",
                [
                    qub.Dash(0),
                    qub.Digits("5", 1)
                ]);
            nextTest("-3.6",
                [
                    qub.Dash(0),
                    qub.Digits("3", 1),
                    qub.Period(2),
                    qub.Digits("6", 3)
                ]);
            nextTest("-1.2.3",
                [
                    qub.Dash(0),
                    qub.Digits("1", 1),
                    qub.Period(2),
                    qub.Digits("2", 3),
                    qub.Period(4),
                    qub.Digits("3", 5)
                ]);
            nextTest(",", [qub.Comma(0)]);
            nextTest(":", [qub.Colon(0)]);
            nextTest(";", [qub.Semicolon(0)]);
            nextTest("!", [qub.ExclamationPoint(0)]);
            nextTest("\\", [qub.Backslash(0)]);
            nextTest("/", [qub.ForwardSlash(0)]);
            nextTest("?", [qub.QuestionMark(0)]);
            nextTest("-", [qub.Dash(0)]);
            nextTest("+", [qub.Plus(0)]);
            nextTest("=", [qub.EqualsSign(0)]);
            nextTest(".", [qub.Period(0)]);
            nextTest("_", [qub.Underscore(0)]);
            nextTest("&", [qub.Ampersand(0)]);
            nextTest("*", [qub.Asterisk(0)]);
            nextTest("(", [qub.LeftParenthesis(0)]);
            nextTest(")", [qub.RightParenthesis(0)]);
            nextTest("#", [qub.Hash(0)]);
            nextTest("^", [qub.Unrecognized("^", 0)]);
        });

        suite("isLetter(string)", () => {
            test(`with "a"`, () => {
                assert.deepStrictEqual(qub.isLetter("a"), true);
            });

            test(`with "A"`, () => {
                assert.deepStrictEqual(qub.isLetter("A"), true);
            });

            test(`with "z"`, () => {
                assert.deepStrictEqual(qub.isLetter("z"), true);
            });

            test(`with "Z"`, () => {
                assert.deepStrictEqual(qub.isLetter("Z"), true);
            });

            test(`with " "`, () => {
                assert.deepStrictEqual(qub.isLetter(" "), false);
            });

            test(`with "."`, () => {
                assert.deepStrictEqual(qub.isLetter("."), false);
            });
        });

        suite("isDigit(string)", () => {
            test(`with "0"`, () => {
                assert.deepStrictEqual(qub.isDigit("0"), true);
            });

            test(`with "5"`, () => {
                assert.deepStrictEqual(qub.isDigit("5"), true);
            });

            test(`with "9"`, () => {
                assert.deepStrictEqual(qub.isDigit("9"), true);
            });

            test(`with "a"`, () => {
                assert.deepStrictEqual(qub.isDigit("a"), false);
            });

            test(`with " "`, () => {
                assert.deepStrictEqual(qub.isDigit(" "), false);
            });

            test(`with "Z"`, () => {
                assert.deepStrictEqual(qub.isDigit("Z"), false);
            });
        });
    });

    suite("absoluteValue()", () => {
        function absoluteValueTest(value: number, expected: number): void {
            test(`with ${value}`, () => {
                assert.deepStrictEqual(qub.absoluteValue(value), expected);
            });
        }

        absoluteValueTest(undefined, undefined);
        absoluteValueTest(null, null);
        absoluteValueTest(0, 0);
        absoluteValueTest(1, 1);
        absoluteValueTest(-1, 1);
    });

    suite("StringIterator", () => {
        function stringIteratorTest(text: string, startIndex: number, endIndex: number, expectedValues: string[]): void {
            test(`with text: ${qub.quote(qub.escape(text))}, startIndex: ${startIndex}, and endIndex: ${endIndex}`, () => {
                const iterator = new qub.StringIterator(text, startIndex, endIndex);
                assert.deepStrictEqual(iterator.hasStarted(), false);
                assert.deepStrictEqual(iterator.hasCurrent(), false);
                assert.deepStrictEqual(iterator.getCurrent(), undefined);

                for (const expectedValue of expectedValues) {
                    assert.deepStrictEqual(iterator.next(), true, `Wrong next() when expecting ${qub.escapeAndQuote(expectedValue)}`);
                    assert.deepStrictEqual(iterator.hasStarted(), true, "Wrong hasStarted()");
                    assert.deepStrictEqual(iterator.getCurrent(), expectedValue, "Wrong getCurrent()");
                }

                for (let i: number = 0; i < 2; ++i) {
                    assert.deepStrictEqual(iterator.next(), false);
                    assert.deepStrictEqual(iterator.hasStarted(), true);
                    assert.deepStrictEqual(iterator.getCurrent(), undefined);
                }
            });
        }

        stringIteratorTest(undefined, 0, 0, []);
        stringIteratorTest("hello", 0, 5, ["h", "e", "l", "l", "o"]);
        stringIteratorTest("hello", 1, 3, ["e", "l"]);
        stringIteratorTest("hello", 4, -1, ["o", "l", "l", "e", "h"]);
    });

    suite("StringIterable", () => {
        test("with undefined", () => {
            const iterable = new qub.StringIterable(undefined);
            assert.deepStrictEqual(iterable.any(), false);
            assert.deepStrictEqual(iterable.getCount(), 0);
            assert.deepStrictEqual(qub.getCombinedText(iterable), "");
            assert.deepStrictEqual(qub.getCombinedText(iterable.iterateReverse()), "");
        });

        test("with null", () => {
            const iterable = new qub.StringIterable(null);
            assert.deepStrictEqual(iterable.any(), false);
            assert.deepStrictEqual(iterable.getCount(), 0);
            assert.deepStrictEqual(qub.getCombinedText(iterable), "");
            assert.deepStrictEqual(qub.getCombinedText(iterable.iterateReverse()), "");
        });

        test(`with ""`, () => {
            const iterable = new qub.StringIterable("");
            assert.deepStrictEqual(iterable.any(), false);
            assert.deepStrictEqual(iterable.getCount(), 0);
            assert.deepStrictEqual(qub.getCombinedText(iterable), "");
            assert.deepStrictEqual(qub.getCombinedText(iterable.iterateReverse()), "");
        });

        test(`with "apples"`, () => {
            const iterable = new qub.StringIterable("apples");
            assert.deepStrictEqual(iterable.any(), true);
            assert.deepStrictEqual(iterable.getCount(), 6);
            assert.deepStrictEqual(qub.getCombinedText(iterable), "apples");
            assert.deepStrictEqual(qub.getCombinedText(iterable.iterateReverse()), "selppa");
        });
    });
});