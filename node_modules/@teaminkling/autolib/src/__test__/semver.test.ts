/**
 * This file tests the methods for the exportable [[SemVer]] type.
 */

import { expect } from 'chai';

import { SemVer, findLatestSemVerUsingString } from "../index";


describe("SemVer.constructFromText (nominal)", () => {
    const parameters: {
        text: string;
        expectedMajor: number;
        expectedMinor: number;
        expectedPatch: number;
        expectedInfo: string | null;
    }[] = [
            /* SemVers with some extremes, some zeroes, and no info strings. */

            {
                "text": "0.1.5",
                "expectedMajor": 0,
                "expectedMinor": 1,
                "expectedPatch": 5,
                "expectedInfo": null,
            },
            {
                "text": "912418.0.12419",
                "expectedMajor": 912418,
                "expectedMinor": 0,
                "expectedPatch": 12419,
                "expectedInfo": null,
            },
            {
                "text": "00.00124.0124",
                "expectedMajor": 0,
                "expectedMinor": 124,
                "expectedPatch": 124,
                "expectedInfo": null,
            },
            {
                "text": "3.31.12412",
                "expectedMajor": 3,
                "expectedMinor": 31,
                "expectedPatch": 12412,
                "expectedInfo": null,
            },
            {
                "text": "0.0.0",
                "expectedMajor": 0,
                "expectedMinor": 0,
                "expectedPatch": 0,
                "expectedInfo": null,
            },

            /* SemVers with info strings. */

            {
                "text": "0.10.5-rc2",
                "expectedMajor": 0,
                "expectedMinor": 10,
                "expectedPatch": 5,
                "expectedInfo": "-rc2"
            },
            {
                "text": "123.456.789-rc2+build2",
                "expectedMajor": 123,
                "expectedMinor": 456,
                "expectedPatch": 789,
                "expectedInfo": "-rc2+build2",
            },
            {
                "text": "124124.1110.512-rc5+2020-06-25",
                "expectedMajor": 124124,
                "expectedMinor": 1110,
                "expectedPatch": 512,
                "expectedInfo": "-rc5+2020-06-25",
            },
            {
                "text": "0001.10.22-invalid but supported",
                "expectedMajor": 1,
                "expectedMinor": 10,
                "expectedPatch": 22,
                "expectedInfo": "-invalid but supported",
            },
            {
                "text": "0432.1098.5124-14uua(*!@Y*&",
                "expectedMajor": 432,
                "expectedMinor": 1098,
                "expectedPatch": 5124,
                "expectedInfo": "-14uua(*!@Y*&",
            },
        ];

    parameters.forEach(group => it(
        `...parses correctly when the input is: "${group.text}"`, () => {
            const version: SemVer = SemVer.constructFromText(group.text);

            expect([version.major, version.minor, version.patch, version.info]).to.eql([
                group.expectedMajor, group.expectedMinor, group.expectedPatch, group.expectedInfo,
            ]);
        }
    ));
});


describe("findLatestSemVerUsingString (nominal)", () => {
    const parameters: {
        lines: string[];
        stable: boolean,
        expectedMajor: number;
        expectedMinor: number;
        expectedPatch: number;
        expectedInfo: string | null;
    }[] = [
        /* A normal case in logical ascending order where everything is v-prefixed and there are only single digits. */

        {
            "lines": [
                "v0.1.0", "v0.2.0", "v0.2.1", "v0.2.2", "v0.2.3", "v0.2.4", "v0.2.5", "v1.0.0", "v1.0.1",
            ],
            "stable": true,
            "expectedMajor": 1,
            "expectedMinor": 0,
            "expectedPatch": 1,
            "expectedInfo": null,
        },

        /* A bit more of a complicated case where there's order but some versions are skipped with double digits. */

        {
            "lines": [
                "v0.3.0", "v0.10.0", "v0.11.5", "v0.11.27", "v1.2.3", "v3.2.1", "v3.3.333", "v3.4.0", "v3.4.1",
            ],
            "stable": true,
            "expectedMajor": 3,
            "expectedMinor": 4,
            "expectedPatch": 1,
            "expectedInfo": null,
        },

        /* Chaotic ordering where some (but not all) of the cases have info strings and some aren't v-prefixed. */

        {
            "lines": [
                "v3.12.3", "11.0.77-i11", "v0.10.1-rc2", "1.234.20-info3", "v0.0.0-initial", "0.2.4", "v0.2.5",
            ],
            "stable": true,
            "expectedMajor": 3,
            "expectedMinor": 12,
            "expectedPatch": 3,
            "expectedInfo": null,
        },

        /* Introducing cases that are completely invalid and some duplicate cases. */

        {
            "lines": [
                "v1.9.12-alpha", "v0.02.0005", "invalid version", "0.00.000-test", "5.0.022-rc12+build5", "0.11.2",
            ],
            "stable": true,
            "expectedMajor": 0,
            "expectedMinor": 11,
            "expectedPatch": 2,
            "expectedInfo": null,
        },

        /* Now allowing info string cases in the maximum calculation (lexicographical order). */

        {
            "lines": [
                "81.2.abc-test", "v2.07.00001-info", "1.1.1", "v0.0.0-init", "5.007.06-rc3", "invalid", "005.6.7-blah",
            ],
            "stable": false,
            "expectedMajor": 5,
            "expectedMinor": 7,
            "expectedPatch": 6,
            "expectedInfo": "-rc3",
        },

        /* Checking to make sure precedence exists between info versions and stable and whitespace is fine. */

        {
            "lines": [
                "\r0.5.1\n", "0.5.10-unstable\n  ", "\t1.0.1-rc51\n", "  \n\n 1.0.1", "\ninvalid ", " 0.2.1-blah \r\n ",
            ],
            "stable": false,
            "expectedMajor": 1,
            "expectedMinor": 0,
            "expectedPatch": 1,
            "expectedInfo": null,
        },
    ];

    parameters.forEach(group => it(
        `...finds the latest ${group.stable ? "stable ver.": "ver."} correctly from (trimmed): ` +
        `[${group.lines.map(line => `"${line.trim()}"`).join(", ")}]`, async () => {
            const version: SemVer = await findLatestSemVerUsingString(group.lines.join("\n"), group.stable);

            expect([version.major, version.minor, version.patch, version.info]).to.eql([
                group.expectedMajor, group.expectedMinor, group.expectedPatch, group.expectedInfo,
            ]);
        }
    ))
});
