import fs from 'fs';

import * as core from '@actions/core';
import * as exec from '@actions/exec';

/*
 * -------------------------------------------------------------------------------------------------------------------
 * - Constants. ------------------------------------------------------------------------------------------------------
 * -------------------------------------------------------------------------------------------------------------------
 */

/**
 * The regular expression that represents a version release.
 *
 * For example, `v0.11.5-beta+17-2020-05-12` will provide parts:
 *
 * - `0`: `0`
 * - `1`: `11`
 * - `2`: `5`
 * - `3`: `-beta+17-2020-05-12`
 */
export const SEMVER_REGEXP: RegExp = /v?(?<major>\d+)\.(?<minor>\d+)\.(?<patch>\d+)(?<info>.*)/;

/*
 * -------------------------------------------------------------------------------------------------------------------
 * - Classes. --------------------------------------------------------------------------------------------------------
 * -------------------------------------------------------------------------------------------------------------------
 */

/** A [RegExp] to [string] replacement map for use on a file. */
export class ReplacementMap {
    /** The regular expression to match and replace. */
    matcher: RegExp;

    /** The literal replacement to use to replace the given regular expression. */
    replacement: string;

    constructor(matcher: RegExp, replacement: string) {
        this.matcher = matcher;
        this.replacement = replacement;
    }
};

/** A basic concrete representation of a Semantic Version. */
export class SemVer {
    /** The major version, immutable. */
    private _major: number;

    /** The minor number, immutable. */
    private _minor: number;

    /** The patch number, immutable. */
    private _patch: number;

    /** The information string, if applicable, immutable. */
    private _info: string | null;

    get major(): number {
        return this._major;
    }

    get minor(): number {
        return this._minor;
    }

    get patch(): number {
        return this._patch;
    }

    get info(): string | null {
        return this._info;
    }

    /**
     * From a textual version, create a [SemVer].
     *
     * These might be something like `0.31.5` or `2.0.0-some_info_here+2020-03-01`, for example.
     *
     * @param text the textual version
     */
    public static constructFromText(text: string): SemVer {
        const match: RegExpMatchArray | null = text.match(SEMVER_REGEXP);

        if (!match) {
            throw Error(`Provided text is not valid SemVer: [${text}]`);
        }

        const groups: {[key: string]: string} = match.groups!;

        const major: number = parseInt(groups["major"]);
        const minor: number = parseInt(groups["minor"]);
        const patch: number = parseInt(groups["patch"]);

        /* Force set to null if falsey (empty string). */

        const info: string | null = groups["info"] || null;

        return new SemVer(major, minor, patch, info);
    }

    /**
     * Return the "zero version" as a [SemVer].
     */
    public static constructZero(): SemVer {
        return new SemVer(0, 0, 0, null);
    }

    /**
     * Find the largest of any number of [[SemVer]]s.
     *
     * @param versions the [[SemVer]]s for which to find the maximum
     */
    public static max(versions: SemVer[]): SemVer {
        let runningMax: SemVer = SemVer.constructZero();

        if (versions.length === 0) {
            core.warning("[Autolib] Running SemVer.max with an empty array. Returning 0.0.0.");
        }

        versions.forEach(version => {
            runningMax = SemVer.compare(version, runningMax);
        });

        return runningMax;
    }

    /**
     * Return the larger of two [[SemVer]]s.
     *
     * @param left a [[SemVer]]
     * @param right a [[SemVer]]
     */
    private static compare(left: SemVer, right: SemVer): SemVer {
        const majorIsSame: boolean = left.major == right.major;
        const majorIsLeft: boolean = left.major > right.major;

        const minorIsSame: boolean = left.minor == right.minor;
        const minorIsLeft: boolean = left.minor > right.minor;

        const patchIsSame: boolean = left.patch == right.patch;
        const patchIsLeft: boolean = left.patch > right.patch;

        /* Is minor greater? */

        const minorIncremented: boolean = majorIsSame && minorIsLeft

        /* Is minor the same and the left patch is greater? */

        const patchIncremented: boolean = !minorIncremented && minorIsSame && patchIsLeft;

        /* Failing that, is the left version stable and the right version unstable? */

        const versionStabilized: boolean = (
            !patchIncremented && patchIsSame && left.info === null && right.info !== null
        );

        /* Failing that, is the left version's version lexically greater? */

        const infoIncremented: boolean = (
            !versionStabilized && left.info != null && right.info != null && left.info.localeCompare(right.info) === 1
        );

        if (majorIsLeft || minorIncremented || patchIncremented || versionStabilized || infoIncremented) {
            return left;
        }

        return right;
    }

    public constructor(major: number, minor: number, patch: number, info: string | null) {
        this._major = major;
        this._minor = minor;
        this._patch = patch;
        this._info = info;
    }

    /**
     * Return "true" if this is a "zero version".
     */
    public isZero() {
        return (this.major === 0 && this.minor === 0 && this.patch === 0 && this.info == null)
    }

    public toString() {
        let representation: string = `${this.major}.${this.minor}.${this.patch}`;

        if (this.info) {
            return `${representation}${this.info}`;
        }

        return representation;
    }
};

/*
 * -------------------------------------------------------------------------------------------------------------------
 * - Utilities. ------------------------------------------------------------------------------------------------------
 * -------------------------------------------------------------------------------------------------------------------
 */

/**
 * Given a file, perform replacements based on the [ReplacementMap] and write.
 *
 * @param filename the file's name
 * @param replacements the [Array] of [ReplacementMap]s
 */
export async function rewriteFileContentsWithReplacements(
    filename: string, replacements: Array<ReplacementMap>
): Promise<void> {
    fs.exists(filename, function (exists: boolean) {
        if (exists) {
            /* If the file exists, we can perform the replacement by reading from the file first: */

            fs.readFile(filename, (_, data: Buffer) => {
                let replaced: string = data.toString();

                replacements.forEach(replaceMap => {
                    replaced = replaced.replace(replaceMap.matcher, replaceMap.replacement);
                })

                fs.writeFile(filename, replaced, (_) => null);
            });
        } else {
            /* If the file does not exist, we produce a warning and stop. */

            core.warning(`[Autolib] Cannot perform replace-rewrite of file that does not exist: ${filename}.`);
        }
    });
}

/**
 * Given a file, perform a single replacement based on the matcher and replacement.
 *
 * @param filename the file's name
 * @param matcher the matcher [RegExp]
 * @param replacement the replacement [string]
 */
export async function rewriteFileContentsWithReplacement(
    filename: string, matcher: RegExp, replacement: string
): Promise<void> {
    rewriteFileContentsWithReplacements(filename, [new ReplacementMap(matcher, replacement)]);
}

/**
 * Given [string] of newline-delimited tags in text, find the latest tag and return it as [[SemVer]].
 *
 * Note the example: `1.0.0-rc2 < 1.0.0`.
 *
 * @param text the text with tags from which to find the latest SemVer version
 * @param stableOnly if the function should ignore all prerelease/build info-appended versions
 * @returns a SemVer representation as a 4-ary [Tuple] of 3 [number]s and 1 optional [string]
 */
export async function findLatestSemVerUsingString(text: string, stableOnly: boolean): Promise<SemVer> {
    const versionsInText: SemVer[] = text.split("\n")
        /* Remove surrounding whitespace from all tags. */

        .map(tag => tag.trim())

        /* Convert into SemVer or zeroed "invalid" version. */

        .map(tag => {
            try {
                const candidate: SemVer = SemVer.constructFromText(tag);

                if (stableOnly && candidate.info) {
                    /* If in "stable-only" mode, versions with info strings are invalid. */

                    core.info(`[Autolib] [Parse] ${tag} is valid SemVer but it's not stable and this is stable mode.`);

                    return SemVer.constructZero();
                }

                core.info(`[Autolib] [Parse] ${tag} is valid SemVer! Nice.`);

                return candidate;
            } catch {
                core.info(`[Autolib] [Parse] ${tag} is invalid SemVer.`);

                return SemVer.constructZero();
            }
        })

        /* Filter out "zeroed" versions. */

        .filter(tag => !tag.isZero());

    const max: SemVer = SemVer.max(versionsInText);

    core.info(
        `[Autolib] [Result] Of versions: [${versionsInText.join(", ")}], the ${stableOnly ? "stable max": "max"} ` +
        `was found to be: [${max}].`
    );

    return max;
}

/**
 * Using `git` tags, find the latest version (if this is possible).
 *
 * If no version is found, just return 0.0.0 with no info associated.
 *
 * @param stableOnly whether we should only extract stable versions
 */
export async function findLatestVersionFromGitTags(stableOnly: boolean): Promise<SemVer> {
    let text: SemVer | null = null;

    try {
        await exec.exec('git fetch --tags');
        await exec.exec('git tag', [], {
            listeners: {
                stdout: async (data: Buffer) => {
                    text = await findLatestSemVerUsingString(data.toString(), stableOnly);
                }
            }
        });
    } catch {
        core.warning("[Autolib] Compliant git tag cannot be found. Returning 0.0.0.");
    }

    if (!text) {
        return SemVer.constructZero();
    }

    return text;
}
